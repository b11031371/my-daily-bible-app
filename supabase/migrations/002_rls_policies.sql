-- Migration 002: Row Level Security Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_log ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (auth.uid() = id);

-- checkins: users see only their own
CREATE POLICY "checkins_select_own" ON checkins FOR SELECT USING (auth.uid() = user_id);

-- reflections: everyone can read (anonymity enforced at app layer)
CREATE POLICY "reflections_select_all" ON reflections FOR SELECT USING (true);
CREATE POLICY "reflections_insert_own" ON reflections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reflections_update_own" ON reflections FOR UPDATE USING (auth.uid() = user_id);

-- badges: public read
CREATE POLICY "badges_select_all" ON badges FOR SELECT USING (true);

-- user_badges: public read
CREATE POLICY "user_badges_select_all" ON user_badges FOR SELECT USING (true);

-- leaderboard_snapshots: public read
CREATE POLICY "leaderboard_select_all" ON leaderboard_snapshots FOR SELECT USING (true);

-- admin_log: only admins can read
CREATE POLICY "admin_log_select_admin" ON admin_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
