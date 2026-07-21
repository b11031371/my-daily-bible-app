/**
 * 徽章圖示。
 *
 * 刻意不從 DB 讀：圖示是設計資產，跟著程式碼版控才能 review、回溯、隨部署一起上。
 * 新增徽章本來就得寫 migration（user_badges 有 FK 指向 badges.id，且 admin API
 * 只有 GET/PUT 沒有 POST），所以圖示放程式碼裡與既有流程一致。
 *
 * DB 的 badges.icon 欄位仍然存在（NOT NULL，移除要 migration），但已經沒有人讀它。
 *
 * 目前使用 Twemoji（Twitter, Inc. 及貢獻者製作，CC-BY 4.0）。選它的原因是各平台
 * 呈現一致——系統 emoji 由裝置字型決定長相，iOS 與 Android 使用者看到的並不同。
 * 授權要求標示出處，已放在設定頁底部（settings.credits*）與 public/badges/README.md。
 *
 * 要換掉某個徽章的圖：把新檔放進 public/badges/ 並改下面的 file 欄位。
 * 拿掉 file 則退回 emoji，所以可以一個一個換，中途不會破圖。
 */
export interface BadgeIcon {
  /** 沒有 file 時的後備顯示 */
  emoji: string
  /** public/ 底下的路徑，例如 '/badges/first-step.svg' */
  file?: string
}

export const BADGE_ICONS: Record<string, BadgeIcon> = {
  first_step:  { emoji: '🌱', file: '/badges/first-step.svg' },
  streak_3:    { emoji: '🔥', file: '/badges/streak-3.svg' },
  streak_7:    { emoji: '⚡', file: '/badges/streak-7.svg' },
  streak_30:   { emoji: '👑', file: '/badges/streak-30.svg' },
  voice:       { emoji: '✍️', file: '/badges/voice.svg' },
  storyteller: { emoji: '📖', file: '/badges/storyteller.svg' },
  century:     { emoji: '💯', file: '/badges/century.svg' },
  faithful:    { emoji: '🕊️', file: '/badges/faithful.svg' },
}
