-- Migration 004: Seed Badge Definitions
-- Editable via /admin/badges UI after initial setup

INSERT INTO badges (id, name_zh, description_zh, icon, condition_type, condition_value, points_bonus) VALUES
  ('first_step',  '第一步',       '完成你的第一次簽到',         '🌱', 'total_checkins',   1,  0),
  ('streak_3',    '三日之火',     '連續簽到 3 天',               '🔥', 'streak',           3,  5),
  ('streak_7',    '一週挑戰',     '連續簽到 7 天',               '⚡', 'streak',           7,  15),
  ('streak_30',   '一月英雄',     '連續簽到 30 天',              '👑', 'streak',           30, 60),
  ('voice',       '發聲者',       '第一次回答反思問題',          '✍️', 'reflection_count', 1,  0),
  ('storyteller', '說故事的人',   '累計回答反思問題 10 次',      '📖', 'reflection_count', 10, 20),
  ('century',     '百點俱樂部',   '累計積分達到 100 分',         '💯', 'total_points',     100,10),
  ('faithful',    '忠心的人',     '累計簽到 20 次',              '🕊️', 'total_checkins',   20, 25);
