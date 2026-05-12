-- Migration 008: reflection likes & bible_range

-- Add bible_range to reflections (nullable for backward compat)
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS bible_range TEXT;

-- Update fn_submit_reflection to accept bible_range
CREATE OR REPLACE FUNCTION fn_submit_reflection(
  p_note_date   DATE,
  p_content     TEXT,
  p_anonymous   BOOLEAN DEFAULT false,
  p_bible_range TEXT    DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_points     INTEGER := 0;
  v_is_new     BOOLEAN;
  v_new_badges TEXT[];
BEGIN
  v_is_new := NOT EXISTS (
    SELECT 1 FROM reflections WHERE user_id = v_user_id AND note_date = p_note_date
  );

  INSERT INTO reflections (user_id, note_date, content, is_anonymous, points_earned, bible_range)
  VALUES (v_user_id, p_note_date, p_content, p_anonymous, CASE WHEN v_is_new THEN 5 ELSE 0 END, p_bible_range)
  ON CONFLICT (user_id, note_date) DO UPDATE
    SET content      = EXCLUDED.content,
        is_anonymous = EXCLUDED.is_anonymous,
        bible_range  = COALESCE(EXCLUDED.bible_range, reflections.bible_range),
        updated_at   = NOW();

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

-- reflection_likes table
CREATE TABLE IF NOT EXISTS reflection_likes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id UUID NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reflection_id, user_id)
);

CREATE INDEX IF NOT EXISTS reflection_likes_reflection_id ON reflection_likes(reflection_id);

ALTER TABLE reflection_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes"
  ON reflection_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like"
  ON reflection_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike their own"
  ON reflection_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
