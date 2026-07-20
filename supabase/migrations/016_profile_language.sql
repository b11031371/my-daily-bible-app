-- Migration 016: Profile language preference
--
-- 語言偏好原本只存在瀏覽器的 bible-lang cookie，但 /api/notify 是由 cron 觸發的，
-- 該 request 不帶使用者 cookie，server 無從得知該送哪種語言的推播文案。
-- 這裡把偏好落到 DB，讓 cron 能查得到；同時讓語言跟著帳號跨裝置。
--
-- 刻意不加 CHECK 約束：語言清單由 src/lib/i18n/index.ts 的 LOCALES 驅動，
-- 新增語言不該還要改 schema。非法值由讀取端的 isLocale() 退回預設。
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'zh';

COMMENT ON COLUMN profiles.language IS
  '使用者語言偏好（對應 LOCALES 的 code，如 zh / en）。cookie 為即時來源，此欄為跨裝置與 server 端推播的來源。';
