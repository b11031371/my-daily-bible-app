-- Migration 001: Initial Schema

-- profiles: extends auth.users
CREATE TABLE profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   TEXT NOT NULL,
  avatar_seed    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  role           TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  total_points   INTEGER NOT NULL DEFAULT 0,
  streak_current INTEGER NOT NULL DEFAULT 0,
  streak_max     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- checkins
CREATE TABLE checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note_date     DATE NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_retro      BOOLEAN NOT NULL DEFAULT false,
  days_late     INTEGER NOT NULL DEFAULT 0 CHECK (days_late BETWEEN 0 AND 3),
  points_earned INTEGER NOT NULL,
  UNIQUE(user_id, note_date)
);

CREATE INDEX checkins_user_date ON checkins(user_id, note_date DESC);
CREATE INDEX checkins_note_date ON checkins(note_date);

-- reflections
CREATE TABLE reflections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note_date     DATE NOT NULL,
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER NOT NULL DEFAULT 5,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, note_date)
);

CREATE INDEX reflections_note_date ON reflections(note_date DESC);
CREATE INDEX reflections_user_id   ON reflections(user_id);

-- badges (static definitions, seeded in migration 004)
CREATE TABLE badges (
  id              TEXT PRIMARY KEY,
  name_zh         TEXT NOT NULL,
  description_zh  TEXT NOT NULL,
  icon            TEXT NOT NULL,
  condition_type  TEXT NOT NULL CHECK (condition_type IN ('streak', 'total_checkins', 'total_points', 'reflection_count')),
  condition_value INTEGER NOT NULL,
  points_bonus    INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- user_badges
CREATE TABLE user_badges (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id  TEXT NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX user_badges_user ON user_badges(user_id);

-- leaderboard_snapshots (pre-computed)
CREATE TABLE leaderboard_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type   TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_label  TEXT NOT NULL,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points        INTEGER NOT NULL DEFAULT 0,
  checkin_count INTEGER NOT NULL DEFAULT 0,
  rank          INTEGER NOT NULL,
  UNIQUE(period_type, period_label, user_id)
);

CREATE INDEX lb_period ON leaderboard_snapshots(period_type, period_label, rank);

-- admin_log (audit trail)
CREATE TABLE admin_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  target_user UUID REFERENCES profiles(id),
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
