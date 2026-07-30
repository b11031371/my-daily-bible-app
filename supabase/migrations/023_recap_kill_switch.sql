-- Migration 023: 每月回顧的後台總開關
--
-- 跟 quiz_open 同一套機制，但這支功能已經上線，所以預設是 'true'（開啟），
-- 關掉才是例外狀態，不像 quiz 那樣預設關閉、等正式開放才打開。
-- 關閉時一般用戶簽到不會跳回顧彈窗、個人頁也不會出現月曆圖示入口；
-- admin 不受影響，可以在關閉期間繼續檢查回顧內容。

INSERT INTO app_settings (key, value) VALUES ('recap_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
