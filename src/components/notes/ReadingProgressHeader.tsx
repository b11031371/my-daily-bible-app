'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { readProgress, saveProgress } from '@/lib/reading-progress'

// NoteViewer 在筆記內容結尾放一個帶這個 id 的空元素，當作「讀完」的終點。
export const NOTE_END_ID = 'note-end'

interface Props {
  userId: string
  date: string
  title: string
  backHref: string
  backLabel: string
  progressLabel: string
}

// 「讀完」的捲動距離：筆記結尾捲到畫面下緣往上 15% 的位置就算讀完。
// 回傳 0 以下代表整篇一開始就看得完。
// 終點還沒真的顯示出來時回傳 null：換頁串流途中頁面可能還藏著（祖先 display: none），
// 那時量到的位置是 0，會被誤判成「一打開就讀完」而記成 100%。
function finishScrollTop(): number | null {
  const end = document.getElementById(NOTE_END_ID)
  if (!end || end.offsetParent === null) return null
  const endTop = end.getBoundingClientRect().top + window.scrollY
  return endTop - window.innerHeight * 0.85
}

/**
 * 筆記頁的標題列，本身就是閱讀進度條：捲動時固定在頂端，漸層色從左往右填滿，
 * 右側百分比跟著滾動。
 *
 * 進度條顯示「看過的最大進度」：只會往前，往回捲、換頁、捲回上次位置都不會讓它變小，
 * 首頁卡片用的也是同一個數字。另外記下離開時的位置，再次打開筆記時捲回那裡（只影響畫面停在哪）。
 */
export default function ReadingProgressHeader({ userId, date, title, backHref, backLabel, progressLabel }: Props) {
  const [progress, setProgress] = useState(0)
  const [shown, setShown] = useState(0)
  // 讀到裝置上的進度之前不顯示數字：整頁載入時伺服器讀不到 localStorage，
  // 送來的 HTML 只能是 0%，等 JS 接手前就會先閃一個錯的 0%
  const [loaded, setLoaded] = useState(false)
  const maxRef = useRef(0)

  // 在畫面第一次畫出來之前就讀進度、直接顯示（數字不從 0 滾上去）。
  // 用 useEffect 的話第一個畫面一定是 0%，裝置慢一點（iPhone、正式環境）就看得到「先 0% 再跳回來」。
  useLayoutEffect(() => {
    const max = readProgress(userId, date).max
    maxRef.current = max
    setProgress(max)
    setShown(max)
    setLoaded(true)
  }, [userId, date])

  useEffect(() => {
    const saved = readProgress(userId, date)

    let frame = 0
    // 捲回上次位置之前的捲動事件不記，否則會把存下的位置蓋成 0
    let restored = false
    function measure() {
      frame = 0
      if (!restored) return
      const target = finishScrollTop()
      if (target === null) return
      const p = target <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / target) * 100))
      // 同一個帳號在別的分頁讀得更多時，以那邊為準，不要把較大的進度蓋掉
      const stored = readProgress(userId, date).max
      if (stored > maxRef.current) maxRef.current = stored
      if (p > maxRef.current) maxRef.current = p
      setProgress(maxRef.current)
      saveProgress(userId, date, { max: maxRef.current, last: p })
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    // 等這一幀排版完成（也讓路由切換時的「捲回頂端」先做完）再捲回上次的位置。
    // 讀完的也一樣捲回結尾：進度條才會跟首頁卡片的勾一致，不會一進來顯示 0%。
    // html 設了 smooth scroll，跳之前先暫時關掉，才會瞬間到位；
    // 不用 scrollTo 的 behavior: 'instant'，部分 Safari 不認得這個值。
    frame = requestAnimationFrame(() => {
      frame = 0
      const target = finishScrollTop()
      if (target !== null && target > 0 && saved.last > 0) {
        const root = document.documentElement
        const prev = root.style.scrollBehavior
        root.style.scrollBehavior = 'auto'
        window.scrollTo(0, (target * saved.last) / 100)
        root.style.scrollBehavior = prev
      }
      restored = true
      measure()
    })
    // 只跟著捲動更新。不聽 resize：切換中英文、字型載入這類版面變動不該改變「讀到哪」。
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      window.removeEventListener('scroll', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [userId, date])

  // 百分比用追趕的方式滾到目標值，數字會動但不跳格；減少動態偏好時直接顯示。
  // 只往上滾：進度本來就只增不減，目標比目前顯示的小（元件剛掛上、還是初始 0 的那一輪）就不動，
  // 否則數字會先往 0 掉再爬回來。
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(prev => Math.max(prev, progress))
      return
    }
    let frame = 0
    function step() {
      setShown(prev => {
        if (prev >= progress) return prev
        const diff = progress - prev
        const next = diff < 0.6 ? progress : prev + diff * 0.22
        if (next !== progress) frame = requestAnimationFrame(step)
        return next
      })
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [progress])

  return (
    // 手機上 -mx-4 撐到貼齊螢幕兩側；寬螢幕（sm 以上）收回跟下面的內容卡片同寬
    <div className="sticky top-0 z-30 -mx-4 sm:mx-0 mb-4 isolate flex items-center gap-2 overflow-hidden border-b border-gray-100 bg-theme-bg/95 py-1.5 pl-1.5 pr-4 backdrop-blur">
      <span
        aria-hidden="true"
        className="reading-fill absolute inset-0 -z-10 transition-[clip-path] duration-150 ease-linear"
        style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
      />
      <Link
        href={backHref}
        aria-label={backLabel}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-lg text-gray-400 hover:text-gray-600 active:opacity-50"
      >
        ‹
      </Link>
      <h1 className="min-w-0 flex-1 text-base font-semibold text-gray-900">{title}</h1>
      <span
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="min-w-[3em] text-right text-sm font-semibold tabular-nums text-gray-600"
      >
        {loaded ? `${Math.round(shown)}%` : ''}
      </span>
    </div>
  )
}
