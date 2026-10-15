// 每日筆記的閱讀進度，只存在這台裝置的瀏覽器裡，不進資料庫：它只是給自己看的
// 輕量提示，換裝置歸零也無妨，換來的是捲動時不必一直寫 DB。
// key 帶 userId：同一台裝置換帳號登入時，進度才不會共用。
//
// 一個使用者、一個日期存兩個數字（百分比）：
//   max  讀過的最高進度，只進不退，首頁今日卡片用它
//   last 上次離開時的位置，再次打開筆記時捲回這裡
const KEY_PREFIX = 'reading-progress:'

export interface ReadingProgress {
  max: number
  last: number
}

function keyFor(userId: string, date: string) {
  return `${KEY_PREFIX}${userId}:${date}`
}

function clampPercent(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0
}

export function readProgress(userId: string, date: string): ReadingProgress {
  try {
    const raw = localStorage.getItem(keyFor(userId, date))
    if (!raw) return { max: 0, last: 0 }
    const data = JSON.parse(raw) as Partial<ReadingProgress>
    return { max: clampPercent(data.max), last: clampPercent(data.last) }
  } catch {
    return { max: 0, last: 0 }
  }
}

export function saveProgress(userId: string, date: string, progress: ReadingProgress) {
  try {
    localStorage.setItem(keyFor(userId, date), JSON.stringify(progress))
  } catch {}
}
