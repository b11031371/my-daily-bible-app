-- Migration 019: 搶答測驗的總開關
--
-- 功能先不對外開放：一般用戶在社群頁還是看得到入口圖示，但點下去只會跳
-- 「敬請期待」，進不了 /quiz。admin 不受此開關影響，可以先自己試玩、備題。
--
-- 註：玩家頁 /play/[pin] 刻意不擋 —— 否則 admin 開了房也沒人進得來，
-- 這個功能在正式開放前就完全無法實測。

INSERT INTO app_settings (key, value) VALUES ('quiz_open', 'false')
ON CONFLICT (key) DO NOTHING;
