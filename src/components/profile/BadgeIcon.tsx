import { Medal } from '@phosphor-icons/react/dist/ssr'
import { BADGE_ICONS } from '@/lib/badges/icons'

interface Props {
  badgeId: string
  /** 邊長（px）。徽章格約 30、通知列約 30。 */
  size: number
  className?: string
}

/**
 * 徽章圖示。自訂 SVG 帶自己的色彩，不吃 currentColor，也不跟主題色——徽章是收藏品，
 * 使用者換主題時它不該跟著變色。代價是可讀性要靠圖檔自己顧（見 public/badges/README）。
 *
 * 找不到對應的 id 時退回一個中性圖示，而非空白：這樣新徽章只寫了 migration、
 * 還沒補圖示時，畫面不會出現一個看不出是什麼的空格。
 */
export default function BadgeIcon({ badgeId, size, className }: Props) {
  const icon = BADGE_ICONS[badgeId]

  if (icon?.file) {
    return (
      <img
        src={icon.file}
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    )
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
