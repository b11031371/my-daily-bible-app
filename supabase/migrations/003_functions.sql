-- Migration 003: Database Functions

-- Points lookup table (matches src/lib/points.ts)
-- days_late: 0=10pts, 1=7pts, 2=5pts, 3=3pts

-- fn_checkin: handles check-in logic atomically
CREATE OR REPLACE FUNCTION fn_checkin(p_note_date DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_days_late     INTEGER;
  v_points        INTEGER;
  v_is_retro      BOOLEAN;
  v_streak        INTEGER;
  v_new_badges    TEXT[];
  v_points_map    INTEGER[] := ARRAY[10, 7, 5, 3];
BEGIN
  -- Validate date range
  v_days_late := CURRENT_DATE - p_note_date;
  IF v_days_late < 0 OR v_days_late > 3 THEN
    RAISE EXCEPTION 'invalid_date: note_date must be between today and 3 days ago';
  END IF;

  v_is_retro := v_days_late > 0;
  v_points   := v_points_map[v_days_late + 1];

  -- Insert checkin (unique constraint prevents duplicates)
  INSERT INTO checkins (user_id, note_date, is_retro, days_late, points_earned)
  VALUES (v_user_id, p_note_date, v_is_retro, v_days_late, v_points);

  -- Update total_points
  UPDATE profiles SET total_points = total_points + v_points WHERE id = v_user_id;

  -- Update streak only for same-day checkins
  IF NOT v_is_retro THEN
    DECLARE
      v_last_date DATE;
    BEGIN
      SELECT note_date INTO v_last_date
      FROM checkins
      WHERE user_id = v_user_id AND note_date < CURRENT_DATE AND days_late = 0
      ORDER BY note_date DESC LIMIT 1;

      IF v_last_date = CURRENT_DATE - 1 THEN
        -- Extend streak
        UPDATE profiles
        SET streak_current = streak_current + 1,
            streak_max = GREATEST(streak_max, streak_current + 1)
        WHERE id = v_user_id;
      ELSE
        -- Reset streak
        UPDATE profiles
        SET streak_current = 1,
            streak_max = GREATEST(streak_max, 1)
        WHERE id = v_user_id;
      END IF;
    END;
  END IF;

  -- Evaluate badges
  v_new_badges := fn_evaluate_badges(v_user_id);

  -- Get updated streak
  SELECT streak_current INTO v_streak FROM profiles WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'points_earned', v_points,
    'streak_current', v_streak,
    'badges_unlocked', to_jsonb(v_new_badges)
  );
END;
$$;

-- fn_submit_reflection: handles reflection submission atomically
CREATE OR REPLACE FUNCTION fn_submit_reflection(
  p_note_date  DATE,
  p_content    TEXT,
  p_anonymous  BOOLEAN DEFAULT false
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_points     INTEGER := 0;
  v_is_new     BOOLEAN;
  v_new_badges TEXT[];
BEGIN
  -- Check if this is a new submission (not an edit)
  v_is_new := NOT EXISTS (
    SELECT 1 FROM reflections WHERE user_id = v_user_id AND note_date = p_note_date
  );

  -- Upsert reflection
  INSERT INTO reflections (user_id, note_date, content, is_anonymous, points_earned)
  VALUES (v_user_id, p_note_date, p_content, p_anonymous, CASE WHEN v_is_new THEN 5 ELSE 0 END)
  ON CONFLICT (user_id, note_date) DO UPDATE
    SET content      = EXCLUDED.content,
        is_anonymous = EXCLUDED.is_anonymous,
        updated_at   = NOW();

  -- Award points only on first submission
  IF v_is_new THEN
    v_points := 5;
    UPDATE profiles SET total_points = total_points + 5 WHERE id = v_user_id;
    v_new_badges := fn_evaluate_badges(v_user_id);
  ELSE
    v_new_badges := ARRAY[]::TEXT[];
  END IF;

  RETURN jsonb_build_object(
    'points_earned', v_points,
    'badges_unlocked', to_jsonb(v_new_badges)
  );
END;
$$;

-- fn_evaluate_badges: checks all badge conditions and awards new badges
CREATE OR REPLACE FUNCTION fn_evaluate_badges(p_user_id UUID)
RETURNS TEXT[] LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile       profiles%ROWTYPE;
  v_reflection_count INTEGER;
  v_badge         badges%ROWTYPE;
  v_qualified     BOOLEAN;
  v_new_badges    TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  SELECT COUNT(*) INTO v_reflection_count FROM reflections WHERE user_id = p_user_id;

  FOR v_badge IN SELECT * FROM badges WHERE is_active = true LOOP
    -- Skip already earned badges
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = v_badge.id) THEN
      CONTINUE;
    END IF;

    v_qualified := CASE v_badge.condition_type
      WHEN 'streak'           THEN v_profile.streak_current >= v_badge.condition_value
      WHEN 'total_checkins'   THEN (SELECT COUNT(*) FROM checkins WHERE user_id = p_user_id) >= v_badge.condition_value
      WHEN 'total_points'     THEN v_profile.total_points >= v_badge.condition_value
      WHEN 'reflection_count' THEN v_reflection_count >= v_badge.condition_value
      ELSE false
    END;

    IF v_qualified THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
      -- Award bonus points
      IF v_badge.points_bonus > 0 THEN
        UPDATE profiles SET total_points = total_points + v_badge.points_bonus WHERE id = p_user_id;
      END IF;
      v_new_badges := array_append(v_new_badges, v_badge.id);
    END IF;
  END LOOP;

  RETURN v_new_badges;
END;
$$;

-- fn_rebuild_leaderboard: pre-computes leaderboard snapshots
CREATE OR REPLACE FUNCTION fn_rebuild_leaderboard(
  p_period_type  TEXT,
  p_period_label TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start DATE;
  v_end   DATE;
BEGIN
  -- Calculate date range from period label
  IF p_period_type = 'weekly' THEN
    -- Label format: '2026-W19'
    v_start := DATE_TRUNC('week', TO_DATE(
      SPLIT_PART(p_period_label, '-W', 1) || ' ' ||
      (SPLIT_PART(p_period_label, '-W', 2)::INTEGER * 7 - 6)::TEXT,
      'IYYY IDD'
    ));
    v_end := v_start + 6;
  ELSE
    -- Label format: '2026-05'
    v_start := TO_DATE(p_period_label || '-01', 'YYYY-MM-DD');
    v_end   := (v_start + INTERVAL '1 month - 1 day')::DATE;
  END IF;

  DELETE FROM leaderboard_snapshots
  WHERE period_type = p_period_type AND period_label = p_period_label;

  INSERT INTO leaderboard_snapshots (period_type, period_label, user_id, points, checkin_count, rank)
  SELECT
    p_period_type,
    p_period_label,
    p.id,
    COALESCE(c.total_points, 0) + COALESCE(r.total_points, 0) AS points,
    COALESCE(c.checkin_count, 0) AS checkin_count,
    ROW_NUMBER() OVER (ORDER BY COALESCE(c.total_points, 0) + COALESCE(r.total_points, 0) DESC) AS rank
  FROM profiles p
  LEFT JOIN (
    SELECT user_id,
           SUM(points_earned) AS total_points,
           COUNT(*) AS checkin_count
    FROM checkins
    WHERE note_date BETWEEN v_start AND v_end
    GROUP BY user_id
  ) c ON c.user_id = p.id
  LEFT JOIN (
    SELECT user_id, SUM(points_earned) AS total_points
    FROM reflections
    WHERE note_date BETWEEN v_start AND v_end
    GROUP BY user_id
  ) r ON r.user_id = p.id;
END;
$$;

-- fn_admin_checkin: admin override for any date (bypasses 3-day limit)
CREATE OR REPLACE FUNCTION fn_admin_checkin(
  p_user_id   UUID,
  p_note_date DATE,
  p_points    INTEGER DEFAULT 10
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id   UUID := auth.uid();
  v_days_late  INTEGER := GREATEST(0, CURRENT_DATE - p_note_date);
  v_new_badges TEXT[];
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  INSERT INTO checkins (user_id, note_date, is_retro, days_late, points_earned)
  VALUES (p_user_id, p_note_date, v_days_late > 0, LEAST(v_days_late, 99), p_points)
  ON CONFLICT (user_id, note_date) DO UPDATE SET points_earned = EXCLUDED.points_earned;

  UPDATE profiles SET total_points = total_points + p_points WHERE id = p_user_id;

  v_new_badges := fn_evaluate_badges(p_user_id);

  -- Log admin action
  INSERT INTO admin_log (admin_id, action_type, target_user, payload)
  VALUES (v_admin_id, 'retro_checkin', p_user_id,
    jsonb_build_object('note_date', p_note_date, 'points', p_points));

  RETURN jsonb_build_object('success', true, 'badges_unlocked', to_jsonb(v_new_badges));
END;
$$;
