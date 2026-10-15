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
  pruneOldProgress()
}

// 舊進度留著沒用：首頁只看今天，筆記頁也很少回頭翻兩個月前的。
const KEEP_DAYS = 60
// 一次頁面載入只掃一次；saveProgress 在捲動時會一直被呼叫，不能每次都掃整個 localStorage
let pruned = false

/** 刪掉 KEEP_DAYS 天前的進度紀錄。依日期判斷，這台裝置上其他帳號的舊紀錄也一併清掉。 */
function pruneOldProgress() {
  if (pruned) return
  pruned = true
  try {
    // 跟 todayString() 一樣以台灣日期計；YYYY-MM-DD 可以直接用字串比大小
    const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000)
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(KEY_PREFIX)) continue
      const date = key.slice(key.lastIndexOf(':') + 1)
      if (date < cutoff) stale.push(key)
    }
    stale.forEach(key => localStorage.removeItem(key))
  } catch {}
}
