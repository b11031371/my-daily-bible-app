-- 回顧手冊的 AI 書卷摘要快取
--
-- 摘要是花錢也花時間的東西（一次呼叫要好幾秒），而回顧是回頭看的快照，內容不會再變。
-- 一人一月產一次就永久留著，之後重看都是即時的。
--
-- locale 進主鍵：摘要是自然語言，使用者切到英文時該拿到英文版，
-- 而不是快取住的中文。
CREATE TABLE recap_summaries (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month      TEXT NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  locale     TEXT NOT NULL,
  -- [{ "book": "詩篇", "summary": "…" }, …]，陣列順序即顯示順序
  summary    JSONB NOT NULL,
  model      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, month, locale)
);

ALTER TABLE recap_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recap_summaries_select_own" ON recap_summaries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 刻意不給 INSERT/UPDATE：只有 service-role 寫得進去，
-- 否則使用者可以自己塞內容進「AI 摘要」欄位。

COMMENT ON TABLE  recap_summaries IS '每月回顧的 AI 書卷摘要，一人一月一語言一列。';
COMMENT ON COLUMN recap_summaries.summary IS '[{book, summary}] 陣列，依當月第一次讀到的先後排序。';
COMMENT ON COLUMN recap_summaries.model IS '產生當下用的模型，日後要重跑舊資料時判斷得出來源。';
