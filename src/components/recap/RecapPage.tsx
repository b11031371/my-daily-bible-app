'use client'
import type { CSSProperties, ReactNode } from 'react'
import { useRecapAnim } from '@/components/recap/RecapAnim'

export type PageTone = 'paper' | 'tint'

interface Props {
  tone?: PageTone
  /** tone='tint' 時的底色，通常是一層 radial-gradient */
  tint?: string
  /** 內容置中（封面、作息、章數這類單一主角的頁） */
  center?: boolean
  /** 頁碼，右下角 */
  page?: number
  /** 由頁面自己管進場動畫時關掉，避免兩套動畫疊在同一批元素上 */
  stagger?: boolean
  children: ReactNode
}

/**
 * 一頁書。統一處理紙質、書脊、留白、頁碼、內容進場。
 *
 * 每頁自己決定色調而不是全部白底——一本每頁都是白紙的手冊，讀起來是簡報不是手冊。
 *
 * 分成外層（不捲，負責紙紋和書脊）和內層（捲動、留白）兩層：紙紋和書脊是用
 * 偽元素畫的，放在會捲動的那層會跟著內容一起捲走。
 */
export default function RecapPage({ tone = 'paper', tint, center, page, stagger = true, children }: Props) {
  // multiply 讓暈色融進紙色，不然數位感的色相會浮在紙面上
  const style: CSSProperties | undefined =
    tone === 'tint' && tint ? { backgroundImage: tint, backgroundBlendMode: 'multiply' } : undefined
  // 看過的頁不再重演進場動畫，見 RecapAnim 的註解
  const animate = useRecapAnim()

  return (
    <div
      // 圓角不對稱：裝訂邊（左）方、書口（右）圓，跟 RecapBook 的書封板同一組半徑
      className={`recap-page recap-spine absolute inset-0 rounded-l-[3px] rounded-r-lg overflow-hidden bg-surface recap-paper ${
        animate ? '' : 'recap-static'
      }`}
      style={style}
    >
      {/* 靠書脊那側留白多一點（pl-7 vs pr-5），這是真書的比例，不是對稱的框 */}
      <div
        className={`absolute inset-0 overflow-y-auto overflow-x-hidden pl-7 pr-5 py-7 ${
          center ? 'flex flex-col' : ''
        }`}
      >
        {/* 置中用 my-auto 而不是容器的 justify-center：justify-center 在可捲容器裡
            內容變高時，溢出的上半截會捲不到（捲軸只到得了下面）。auto margin 在
            內容夠短時一樣置中，內容過高時自動收成 0，兩端都留得住。
            字級設定調大、徽章或成員很多的月份都會踩到這條。 */}
        <div className={`${stagger ? 'recap-stagger space-y-3' : ''} ${center ? 'text-center my-auto' : ''}`}>
          {children}
        </div>
      </div>

      {/* 頁碼：字體用內頁的文楷（封面那支 Garamond 的數字放在紙上偏生硬），
          顏色吃主題 token，可讀性靠 .recap-book 的描邊保證。 */}
      {page !== undefined && (
        <span
          className="absolute bottom-3 right-5 text-[1.05rem] font-semibold leading-none text-heading pointer-events-none select-none"
          aria-hidden="true"
        >
          {page}
        </span>
      )}
    </div>
  )
}
