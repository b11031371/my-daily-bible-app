/**
 * 首頁風景（HomeScenery）用的天色與日月計算。全部依使用者手機的本地時間，
 * 所以只能在瀏覽器端呼叫——伺服器不知道使用者在哪個時區。
 */

export type SkyTime = 'morning' | 'noon' | 'dusk' | 'night'

/** 依小時（可帶小數，例如 18.5）分成四種天色。 */
export function skyTimeOf(hour: number): SkyTime {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 16) return 'noon'
  if (hour >= 16 && hour < 19) return 'dusk'
  return 'night'
}

export interface Celestial {
  /** 白天顯示太陽、晚上顯示月亮 */
  body: 'sun' | 'moon'
  /** 水平位置，0–100（%） */
  x: number
  /** 高度，0 = 地平線（山後）、1 = 弧線最高點 */
  altitude: number
}

/**
 * 太陽 6–18 點、月亮 18–隔天 6 點，各自沿半圓弧從左邊山後升起、走到右邊山後落下。
 * 月亮的位置只是畫面上的示意，不是真實的月出月落時間。
 */
export function celestialAt(hour: number): Celestial {
  const isDay = hour >= 6 && hour < 18
  const progress = isDay ? (hour - 6) / 12 : ((hour - 18 + 24) % 24) / 12
  const angle = Math.PI * progress
  return {
    body: isDay ? 'sun' : 'moon',
    // 弧線兩端收在 15%～85%：日出日落時太陽貼著山邊，不會躲到畫面外
    x: 50 - 35 * Math.cos(angle),
    altitude: Math.sin(angle),
  }
}

// 2000-01-06 18:14 UTC 是一次新月；朔望月平均 29.530588853 天。
// 這個近似法誤差在半天以內，畫月亮形狀綽綽有餘。
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14)
const SYNODIC_MONTH_DAYS = 29.530588853

/** 月相：0 = 新月、0.25 = 上弦、0.5 = 滿月、0.75 = 下弦。 */
export function moonPhaseAt(date: Date): number {
  const days = (date.getTime() - NEW_MOON_EPOCH) / 86_400_000
  return ((days / SYNODIC_MONTH_DAYS) % 1 + 1) % 1
}

/**
 * 以原點為圓心、半徑 r 的月亮亮面路徑（SVG path）。
 * 外緣是半個圓，明暗交界是一段橢圓弧：盈月亮右邊、虧月亮左邊（北半球看到的樣子）。
 */
export function moonLitPath(r: number, phase: number): string {
  const k = (r * Math.abs(Math.cos(2 * Math.PI * phase))).toFixed(2)
  if (phase < 0.5) {
    const sweep = phase < 0.25 ? 0 : 1
    return `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${k} ${r} 0 0 ${sweep} 0 ${-r}Z`
  }
  const sweep = phase < 0.75 ? 0 : 1
  return `M0 ${-r} A${r} ${r} 0 0 0 0 ${r} A${k} ${r} 0 0 ${sweep} 0 ${-r}Z`
}
