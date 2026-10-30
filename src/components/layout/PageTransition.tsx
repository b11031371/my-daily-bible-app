'use client'
import { ViewTransition, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 換頁過場。動畫依 <Link transitionTypes> 帶的類型決定（CSS 見 globals.css 的「換頁過場」）：
 * - tab：底部導覽切分頁，新頁淡入並微微上浮
 * - nav-forward：進到內頁（筆記、設定），新頁從右邊推進來
 * - nav-back：從內頁返回，內頁往右退出
 * 沒帶類型的換頁（瀏覽器返回鍵、沒帶 transitionTypes 的 router.push）不播。
 *
 * key 用網址：換頁時舊頁 exit、新頁 enter，兩邊才各自有快照可以動。
 * 外層包一層頁面底色：快照預設是透明的，左右推的時候兩頁的字會疊在一起。
 * 最小高度扣掉 <main> 底部留給導覽列的 pb-20（5rem），短頁面才不會多出一段可以捲。
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <ViewTransition
      key={pathname}
      enter={{ tab: 'tab-in', 'nav-forward': 'push-in', 'nav-back': 'pop-in', default: 'none' }}
      exit={{ tab: 'tab-out', 'nav-forward': 'push-out', 'nav-back': 'pop-out', default: 'none' }}
      default="none"
    >
      <div className="min-h-[calc(100dvh-5rem)] bg-theme-bg">{children}</div>
    </ViewTransition>
  )
}
