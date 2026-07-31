-- 每日筆記的經文範圍快取
--
-- 範圍的原始出處是 GitHub 上每天的 note_zh.md，靠 regex 抓 **和合本：** 那一行，
-- 一次要下載整份幾十 KB 的筆記。月回顧要顯示每天讀了什麼，即時抓等於一個月 30 次
-- 下載，所以先落地成表。
--
-- 一天一列、全站共用，不是一人一份。由 /api/revalidate 在筆記上傳後順手補齊，
-- 後台也有手動同步鈕可以回填舊資料。
CREATE TABLE note_meta (
  date        TEXT PRIMARY KEY CHECK (date ~ '^\d{4}-\d{2}-\d{2}$'),
  bible_range TEXT,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE note_meta ENABLE ROW LEVEL SECURITY;

-- 內容本來就是公開筆記的一部分，登入者都能讀。
CREATE POLICY "note_meta_select_all" ON note_meta
  FOR SELECT TO authenticated USING (true);

-- 刻意不給 anon key 任何寫入權限：只有 service-role（繞過 RLS）能寫。

COMMENT ON TABLE  note_meta IS '每日筆記的經文範圍快取，避免回顧頁為了一行字下載整月筆記。';
COMMENT ON COLUMN note_meta.bible_range IS '繁中經文範圍原文（例：馬可福音 4:1-20）；NULL 代表該日筆記沒有 **和合本：** 那一行，下次同步會再試。';
