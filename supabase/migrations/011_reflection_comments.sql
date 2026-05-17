CREATE TABLE reflection_comments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id  UUID NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content        TEXT NOT NULL CHECK (char_length(content) >= 1),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reflection_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON reflection_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment"
  ON reflection_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON reflection_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON reflection_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());
