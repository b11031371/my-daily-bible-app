-- 回顧摘要的「自動補算」與「依留言數發放的重新整理次數」
--
-- 022 建這張表時的前提是「回顧是回頭看的快照，內容不會再變」，所以一人一月一語言
-- 只產一次、永久留著。但個人頁的月份選單本來就讓人點得進「還沒過完的這個月」
-- （見 RecapMonthMenu），月中打開回顧的人拿到的是只涵蓋前半個月的摘要，而且
-- 從此定型——後半個月寫的留言永遠進不去。
--
-- 無限重產不是選項（每一次都是真的要付錢的 AI 呼叫），所以分成兩層：
--
--   1. 自動補算（不扣次數）：第一次生成、月初簽到彈窗那次，以及該月結束後第一次
--      打開時發現內容跟快取對不上——這些都是系統自己觸發的，一律免費。
--   2. 手動重新整理（扣次數）：次數依那個月寫了幾則留言發放，寫越多拿越多。
--      2 則起跳給 2 次，滿 5 則再多 3 次（共 5 次），之後每多一則多一次。
--
-- 刻意「沒有」封存旗標：過去的月份靠指紋比對就知道要不要補算，補完指紋就一致，
-- 下次打開直接命中快取。這比記一個「補算過了」的旗標更準——補簽到（可回補 3 天）
-- 補進來的留言還是會被自動接住。過去月份的次數也因此凍結而不作廢：留言數不再
-- 增加，沒用完的次數隨時打開都還能用。

ALTER TABLE recap_summaries
  -- 已用掉幾次「手動」重新整理。自動補算不計。
  -- 上限 31 是物理上限：留言一人一天一列，一個月最多 31 則，次數最多也就 31。
  ADD COLUMN refresh_count SMALLINT NOT NULL DEFAULT 0
    CHECK (refresh_count BETWEEN 0 AND 31),
  -- 生成這份摘要時那個月有幾則留言。0 代表 024 之前就存在的舊資料，不會跟真值
  -- 撞號：留言數 0 的月份根本不寫入這張表。
  ADD COLUMN source_count SMALLINT NOT NULL DEFAULT 0,
  -- 生成當下那個月留言的 max(updated_at)。跟 source_count 兩個湊成指紋：
  -- 新增讓兩者都變、編輯讓時間變、刪除讓則數變，三種變動都抓得到。
  ADD COLUMN source_updated_at TIMESTAMPTZ,
  -- 最後一次真的重新生成的時間。created_at 保留原意（第一次生成的時間）。
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN recap_summaries.refresh_count IS
  '已用掉的手動重新整理次數（0-31）；自動補算不計。';
COMMENT ON COLUMN recap_summaries.source_count IS
  '生成當下那個月的留言則數；0 代表 024 之前的舊資料。';
COMMENT ON COLUMN recap_summaries.source_updated_at IS
  '生成當下那個月留言的 max(updated_at)；NULL 代表 024 之前的舊資料。';
COMMENT ON COLUMN recap_summaries.updated_at IS
  '最後一次重新生成的時間。';

-- 表層註解也要跟著改，022 寫的前提已經不成立了。
COMMENT ON TABLE recap_summaries IS
  '每月回顧的 AI 書卷摘要，一人一月一語言一列。內容變動時會自動補算，使用者也能用當月掙到的次數手動重新整理。';

-- 舊資料不需要特別處理：預設值 source_count = 0 / source_updated_at = NULL 一定
-- 跟真實留言對不上，所以下次真的有人打開那個月時會自動免費重產一次，等於自我
-- 修復——那批列裡本來就有一部分是月中產出的半份摘要。沒人再打開的月份則一毛錢
-- 都不花。
