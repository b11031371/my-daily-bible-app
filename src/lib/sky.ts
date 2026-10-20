/**
 * 首頁風景（HomeScenery）用的天色與日月計算。全部依使用者手機的本地時間，
 * 所以只能在瀏覽器端呼叫——伺服器不知道使用者在哪個時區。
 */

export type SkyTime = 'morning' | 'noon' | 'dusk' | 'night'

export interface SkyState {
  time: SkyTime
  /** 以下都是手機當地時間的小時數（可帶小數，例如 17.42 = 17:25） */
  /** 晨光：太陽升到地平線下 6°，天空開始泛白 */
  dawn: number
  sunrise: number
  sunset: number
  /** 暮光：太陽降到地平線下 6°，晚霞褪去、天空轉成深藍 */
  dusk: number
}

/**
 * 依手機的時區和時間，算出今天的日出日落，決定天色時段：
 * 夜晚 → 晨光（地平線下 6°）→ 早晨 → 日出後 5 小時 → 中午 → 日落前 1 小時（黃金時刻）→ 傍晚 → 暮光（地平線下 6°）→ 夜晚。
 *
 * 位置用時區推估（不跳權限詢問）：查表取時區代表城市的經緯度，查不到就用 UTC 時差換經度、緯度用 25°。
 * 台灣全用台北的座標，日出日落誤差約 ±5 分鐘，對天色沒有影響。
 * 日出日落用 NOAA 的太陽位置近似公式，誤差 1～2 分鐘。
 *
 * 這個函式會被 layout 用 .toString() 原封不動塞進 <head> 的行內 script，在畫面出現前就把時段
 * 寫到 <html data-sky>，首頁第一幀的天色和標題顏色就是對的。所以它必須自給自足：
 * 不能引用這個檔案或其他模組的任何東西，要用的資料和輔助函式都寫在函式裡面。
 */
export function skyStateAt(now: Date = new Date()): SkyState {
  // 時區代表城市的 [緯度, 經度]
  const TZ: Record<string, [number, number]> = {
    'Asia/Taipei': [25.03, 121.56], 'Asia/Manila': [14.6, 120.98], 'Asia/Hong_Kong': [22.32, 114.17],
    'Asia/Macau': [22.2, 113.55], 'Asia/Shanghai': [31.23, 121.47], 'Asia/Singapore': [1.35, 103.82],
    'Asia/Kuala_Lumpur': [3.14, 101.69], 'Asia/Bangkok': [13.76, 100.5], 'Asia/Ho_Chi_Minh': [10.82, 106.63],
    'Asia/Saigon': [10.82, 106.63], 'Asia/Jakarta': [-6.2, 106.85], 'Asia/Tokyo': [35.68, 139.69],
    'Asia/Seoul': [37.57, 126.98], 'Asia/Kolkata': [28.61, 77.21], 'Asia/Calcutta': [28.61, 77.21],
    'Asia/Dubai': [25.2, 55.27], 'Australia/Sydney': [-33.87, 151.21], 'Australia/Melbourne': [-37.81, 144.96],
    'Australia/Brisbane': [-27.47, 153.03], 'Australia/Perth': [-31.95, 115.86], 'Pacific/Auckland': [-36.85, 174.76],
    'Europe/London': [51.51, -0.13], 'Europe/Paris': [48.86, 2.35], 'Europe/Berlin': [52.52, 13.4],
    'America/New_York': [40.71, -74.01], 'America/Toronto': [43.65, -79.38], 'America/Chicago': [41.88, -87.63],
    'America/Denver': [39.74, -104.99], 'America/Los_Angeles': [34.05, -118.24], 'America/Vancouver': [49.28, -123.12],
    'Pacific/Honolulu': [21.31, -157.86], 'America/Sao_Paulo': [-23.55, -46.63],
  }
  const offsetMin = -now.getTimezoneOffset()
  let lat = 25
  let lon = offsetMin / 4
  try {
    const hit = TZ[Intl.DateTimeFormat().resolvedOptions().timeZone]
    if (hit) { lat = hit[0]; lon = hit[1] }
  } catch {}

  // NOAA 太陽位置近似公式：由今天是一年的第幾天算出均時差與太陽赤緯
  const rad = Math.PI / 180
  const dayOfYear = (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000
  const g = (2 * Math.PI / 365) * (dayOfYear - 1)
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const noonMin = 720 - 4 * lon - eqTime + offsetMin
  // 太陽中心降到天頂角 zenith 度的時刻（早、晚各一個），回傳當地小時數；極區沒有解時回傳 null
  const at = (zenith: number): [number, number] | null => {
    const cosH = Math.cos(zenith * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)
    if (cosH < -1 || cosH > 1) return null
    const h = 4 * Math.acos(cosH) / rad
    return [(noonMin - h) / 60, (noonMin + h) / 60]
  }
  // 日出日落用 90.833°：扣掉大氣折射和太陽半徑，太陽上緣剛露出地平線的那一刻
  const sun = at(90.833) || [6, 18]
  const civil = at(96) || [sun[0] - 0.4, sun[1] + 0.4]

  const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
  const time: SkyTime =
    hour < civil[0] || hour >= civil[1] ? 'night'
      : hour < sun[0] + 5 ? 'morning'
        : hour < sun[1] - 1 ? 'noon'
          : 'dusk'
  return { time, dawn: civil[0], sunrise: sun[0], sunset: sun[1], dusk: civil[1] }
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
 * 太陽從日出走到日落、月亮從日落走到隔天日出，各自沿半圓弧從左邊山後升起、走到右邊山後落下。
 * 月亮的位置只是畫面上的示意，不是真實的月出月落時間。
 */
export function celestialAt(hour: number, { sunrise, sunset }: Pick<SkyState, 'sunrise' | 'sunset'>): Celestial {
  const isDay = hour >= sunrise && hour < sunset
  const night = 24 - (sunset - sunrise)
  const progress = isDay ? (hour - sunrise) / (sunset - sunrise) : ((hour - sunset + 24) % 24) / night
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
