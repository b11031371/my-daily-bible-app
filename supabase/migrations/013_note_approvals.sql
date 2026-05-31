-- 審核紀錄
CREATE TABLE note_approvals (
  date         TEXT PRIMARY KEY CHECK (date ~ '^\d{4}-\d{2}-\d{2}$'),
  approved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by  UUID NOT NULL REFERENCES profiles(id)
);

ALTER TABLE note_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read" ON note_approvals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin insert" ON note_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin delete" ON note_approvals
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- App 全域設定（key/value）
CREATE TABLE app_settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read" ON app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin write" ON app_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 預設關閉審核模式
INSERT INTO app_settings (key, value) VALUES ('approval_mode', 'false');
