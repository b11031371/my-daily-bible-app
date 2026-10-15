-- 心得框的 AI 下筆建議
--
-- 筆記頁的心得輸入框會顯示一句 AI 寫的「心得開頭」，材料是當天筆記的「經文分析」與
-- 「問題反思」兩段。每一次產生都是真的要付錢的 AI 呼叫，所以分兩張表：
--
--   1. reflection_prompt_cache：每份筆記、每種語言的「第一句建議」，全站共用。
--      打開筆記頁時直接讀這裡，不必每個人都呼叫一次 AI，也不用等。
--   2. reflection_prompt_usage：「換一個」的次數，一人一天一列，上限 5 次。
--      換一個產生的句子只給當下那個人看，不寫進快取。
--
-- 兩張表都只讓 service-role 寫入（API route 驗完身分再寫）：
-- 使用者不能自己把次數改回 0，也不能往「AI 建議」欄位塞內容。

CREATE TABLE reflection_prompt_cache (
  note_date   TEXT NOT NULL CHECK (note_date ~ '^\d{4}-\d{2}-\d{2}$'),
  lang        TEXT NOT NULL CHECK (lang IN ('zh', 'en')),
  prompt      TEXT NOT NULL,
  -- 產生當下餵給 AI 的那兩段筆記內容的雜湊。筆記重新上傳、內容改了，雜湊就對不上，
  -- 下次有人打開時重新產生一次；內容沒變就一直命中快取。
  source_hash TEXT NOT NULL,
  model       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (note_date, lang)
);

ALTER TABLE reflection_prompt_cache ENABLE ROW LEVEL SECURITY;

-- 建議句本來就是要顯示給所有人看的，登入者都能讀。
CREATE POLICY "reflection_prompt_cache_select_all" ON reflection_prompt_cache
  FOR SELECT TO authenticated USING (true);

-- 刻意不給 INSERT/UPDATE：只有 service-role 寫得進去。

COMMENT ON TABLE  reflection_prompt_cache IS '每份筆記每種語言的第一句 AI 心得建議，全站共用。';
COMMENT ON COLUMN reflection_prompt_cache.source_hash IS '產生當下「經文分析＋問題反思」內容的雜湊；筆記改版時對不上就重新產生。';
COMMENT ON COLUMN reflection_prompt_cache.model IS '產生當下用的模型，日後要重跑舊資料時判斷得出來源。';


CREATE TABLE reflection_prompt_usage (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 以台灣日期計（同 checkins.note_date，由 app 的 todayString() 算出），跨日自動歸零
  usage_date TEXT NOT NULL CHECK (usage_date ~ '^\d{4}-\d{2}-\d{2}$'),
  -- 上限寫成約束：就算 API 有 bug 或被併發打爆，次數也不可能超過 5
  swap_count SMALLINT NOT NULL DEFAULT 0 CHECK (swap_count BETWEEN 0 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE reflection_prompt_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reflection_prompt_usage_select_own" ON reflection_prompt_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 刻意不給 INSERT/UPDATE：只有 service-role 寫得進去，否則使用者可以自己把次數歸零。

COMMENT ON TABLE  reflection_prompt_usage IS '心得框「換一個」AI 建議的使用次數，一人一天一列，上限 5 次。';
COMMENT ON COLUMN reflection_prompt_usage.swap_count IS '當天已用掉的「換一個」次數（0-5）；第一句建議來自共用快取，不計次。';
