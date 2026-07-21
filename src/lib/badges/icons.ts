/**
 * 徽章圖示。
 *
 * 刻意不從 DB 讀：圖示是設計資產，跟著程式碼版控才能 review、回溯、隨部署一起上。
 * 新增徽章本來就得寫 migration（user_badges 有 FK 指向 badges.id，且 admin API
 * 只有 GET/PUT 沒有 POST），所以圖示放程式碼裡與既有流程一致。
 *
 * DB 的 badges.icon 欄位仍然存在（NOT NULL，移除要 migration），但已經沒有人讀它。
 *
 * 換成自訂圖：把 SVG 放進 public/badges/，然後在下面補上 file 欄位即可。
 * 沒有 file 的就繼續用 emoji，所以可以一個一個換，中途不會破圖。
 */
export interface BadgeIcon {
  /** 還沒有自訂圖時的後備顯示 */
  emoji: string
  /** public/ 底下的路徑，例如 '/badges/first-step.svg' */
  file?: string
}

export const BADGE_ICONS: Record<string, BadgeIcon> = {
  first_step:  { emoji: '🌱' },
  streak_3:    { emoji: '🔥' },
  streak_7:    { emoji: '⚡' },
  streak_30:   { emoji: '👑' },
  voice:       { emoji: '✍️' },
  storyteller: { emoji: '📖' },
  century:     { emoji: '💯' },
  faithful:    { emoji: '🕊️' },
}
