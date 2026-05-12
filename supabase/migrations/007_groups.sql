-- Migration 007: Group tree (community planting)

CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT '我們的樹',
  invite_code TEXT UNIQUE NOT NULL,
  fruit_order TEXT[] NOT NULL,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at   TIMESTAMPTZ DEFAULT NULL,
  role      TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  UNIQUE(group_id, user_id)
);

-- RLS: groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read groups"
  ON groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Current members can rename group"
  ON groups FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = id AND user_id = auth.uid() AND left_at IS NULL
    )
  );

-- RLS: group_members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read group_members"
  ON group_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own membership"
  ON group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
  ON group_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);
