-- Migration 017: 讓管理員能寫入 badges
--
-- 問題：002 只為 badges 建了 SELECT 政策，沒有 UPDATE 政策。RLS 已啟用的情況下，
-- 缺政策的 UPDATE 會匹配到 0 筆「而且不報錯」，因此 /admin/badges 的儲存一直是
-- 靜默失效——畫面顯示「已儲存」，重新整理後卻沒變。
--
-- 修法沿用本專案既有的管理員判定寫法（見 002 的 admin_log_select_admin）。
-- profiles 有 profiles_select_all，故子查詢不會被 RLS 擋，也不會與 badges 互相遞迴。
--
-- 注意：這是 DB 層的真正防線。API 端另有 role 檢查，但那只負責回傳合適的 403；
-- 即使應用層檢查被改壞，這條政策仍然擋得住。

CREATE POLICY "badges_update_admin" ON badges
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
