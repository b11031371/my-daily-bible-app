-- Migration 006: Fix timezone for fn_checkin (use Asia/Taipei instead of UTC CURRENT_DATE)

CREATE OR REPLACE FUNCTION fn_checkin(p_note_date DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_today         DATE := (NOW() AT TIME ZONE 'Asia/Taipei')::DATE;
  v_days_late     INTEGER;
  v_points        INTEGER;
  v_is_retro      BOOLEAN;
  v_streak        INTEGER;
  v_new_badges    TEXT[];
  v_points_map    INTEGER[] := ARRAY[10, 7, 5, 3];
BEGIN
  -- Validate date range
  v_days_late := v_today - p_note_date;
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
      WHERE user_id = v_user_id AND note_date < v_today AND days_late = 0
      ORDER BY note_date DESC LIMIT 1;

      IF v_last_date = v_today - 1 THEN
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

-- Fix fn_admin_checkin as well for consistency
CREATE OR REPLACE FUNCTION fn_admin_checkin(
  p_user_id   UUID,
  p_note_date DATE,
  p_points    INTEGER DEFAULT 10
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id   UUID := auth.uid();
  v_today      DATE := (NOW() AT TIME ZONE 'Asia/Taipei')::DATE;
  v_days_late  INTEGER := GREATEST(0, v_today - p_note_date);
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
