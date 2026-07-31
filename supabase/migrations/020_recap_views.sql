-- 每月回顧彈窗的「已看過」狀態
--
-- 存 DB 而不是 localStorage：使用者換手機、清瀏覽器資料、或手機電腦並用時，
-- 這個一年只有 12 次的彈窗不該重複跳。
--
-- 不加在 profiles 上：profiles_update_self 沒有 WITH CHECK，權限比這裡需要的寬；
-- 而且「看過哪幾個月」本質是集合不是單一值。
--
-- (user_id, month) 的主鍵同時擔任併發鎖：兩個簽到請求同時進來時，
-- INSERT ... ON CONFLICT DO NOTHING 只有一個拿得到回傳列，前端不必自己做互斥。
CREATE TABLE recap_views (
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month     TEXT NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, month)
);

ALTER TABLE recap_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recap_views_select_own" ON recap_views
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "recap_views_insert_own" ON recap_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 刻意不給 UPDATE / DELETE：這張表只長不改。開發時要重測請直接下 SQL 刪。

COMMENT ON TABLE  recap_views IS '使用者已看過的「上個月回顧」彈窗紀錄，一個月一列。';
COMMENT ON COLUMN recap_views.month IS '被回顧的月份 YYYY-MM（Asia/Taipei 曆），不是看的當下的月份。';
