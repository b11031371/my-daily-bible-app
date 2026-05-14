CREATE POLICY "reflections_delete_own"
ON reflections
FOR DELETE
USING (auth.uid() = user_id);
