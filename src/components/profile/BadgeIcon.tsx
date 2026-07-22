'use client'
import { useEffect, useState } from 'react'
import { Medal } from '@phosphor-icons/react/dist/ssr'
import { BADGE_ICONS, BADGE_ART_VERSION } from '@/lib/badges/icons'

interface Props {
  badgeId: string
  /** 邊長（px）。徽章格約 30、通知列約 30。 */
  size: number
  className?: string
}

/** 立刻重試的次數，之後改成等外部訊號。間隔 0.6s、1.2s、2.4s。 */
const QUICK_RETRIES = 3

/**
 * 徽章圖示。自訂 SVG 帶自己的色彩，不吃 currentColor，也不跟主題色——徽章是收藏品，
 * 使用者換主題時它不該跟著變色。代價是可讀性要靠圖檔自己顧（見 public/badges/README）。
 *
 * 找不到對應的 id 時退回一個中性圖示，而非空白：這樣新徽章只寫了 migration、
 * 還沒補圖示時，畫面不會出現一個看不出是什麼的空格。
 *
 * 載入失敗會自己重試。原因是 <img> 天生不重試：請求掛掉就是永久空白，使用者得手動
 * 重新整理才會回來。而失敗最常發生在 PWA 從背景醒來的那一刻（系統清掉了解碼好的
 * 圖片、網路又還沒接上），正是使用者最不會想到要重整的時候。
 */
export default function BadgeIcon({ badgeId, size, className }: Props) {
  const icon = BADGE_ICONS[badgeId]
  // attempt 0 是正常載入；之後每加一次就換一個網址，逼瀏覽器重發請求
  // （沿用同一個網址時，失敗的結果可能被記在圖片快取裡而不會真的重試）。
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!failed) return

    if (attempt < QUICK_RETRIES) {
      const timer = setTimeout(() => {
        setFailed(false)
        setAttempt(n => n + 1)
      }, 600 * 2 ** attempt)
      return () => clearTimeout(timer)
    }

    // 連著失敗這麼多次，通常是斷網或伺服器暫時有事，繼續盲目重試只是浪費電。
    // 改成等一個「情況可能變了」的訊號：網路回來，或使用者把 app 切回前景。
    const retry = () => {
      setFailed(false)
      setAttempt(n => n + 1)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') retry()
    }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [failed, attempt])

  if (icon?.file) {
    // 快速重試都用完還是失敗，先擺 emoji 頂著——等訊號可能等很久，這期間留一個
    // 空格比擺個長相不同的 emoji 更難理解。重試成功後會自己換回圖檔。
    if (!(failed && attempt >= QUICK_RETRIES)) {
      const src = attempt === 0
        ? `${icon.file}?v=${BADGE_ART_VERSION}`
        : `${icon.file}?v=${BADGE_ART_VERSION}&retry=${attempt}`

      return (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className={className}
          style={{ width: size, height: size, objectFit: 'contain' }}
          onError={() => setFailed(true)}
        />
      )
    }
  }

  if (icon) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">
        {icon.emoji}
      </span>
    )
  }

  return <Medal size={size} weight="fill" className={className} />
}
