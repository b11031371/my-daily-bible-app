-- 記住每個人「換一個」最後換到的 AI 心得建議
--
-- 025 的設計裡，換一個產生的句子只回給當下那個畫面，沒有存起來：重新整理、離開再回來
-- 或切換語言，就變回全站共用的第一句，但已經扣掉的次數不會退。等於花次數換到的句子
-- 一重整就沒了。
--
-- 這張表一人一份筆記一種語言一列，存最後換到的那句。GET 先看這裡，有就直接給，
-- 沒有才給 reflection_prompt_cache 的共用第一句。
-- 依筆記＋語言分開記：在中文換到的句子，不會因為切到英文換了一次就被蓋掉。

CREATE TABLE reflection_prompt_picks (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note_date  TEXT NOT NULL CHECK (note_date ~ '^\d{4}-\d{2}-\d{2}$'),
  lang       TEXT NOT NULL CHECK (lang IN ('zh', 'en')),
  prompt     TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, note_date, lang)
);

ALTER TABLE reflection_prompt_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reflection_prompt_picks_select_own" ON reflection_prompt_picks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 刻意不給 INSERT/UPDATE：只有 service-role 寫得進去，使用者不能往「AI 建議」欄位塞內容。

COMMENT ON TABLE  reflection_prompt_picks IS '每個人在每份筆記、每種語言「換一個」最後換到的 AI 心得建議。';
COMMENT ON COLUMN reflection_prompt_picks.prompt IS '最後一次換一個產生的句子；有這列時 GET 優先回傳它，而不是共用的第一句。';
