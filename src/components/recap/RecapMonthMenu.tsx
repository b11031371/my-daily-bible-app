'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarBlank } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { getLocaleMeta } from '@/lib/i18n'

interface Props {
  /** 帳號建立日，決定往回列到哪個月 */
  createdAt: string
  /** 台北曆的當月 'YYYY-MM'，決定往後列到哪個月 */
  currentMonth: string
  /** 從回顧彈窗的「前往個人頁」連結進來時是 true：圈出圖示＋帶一張說明卡 */
  showTip?: boolean
}

/**
 * 每月回顧的入口：一顆圖示，點開才列月份。
 *
 * 月份清單放在展開層而不是常駐卡片——它是「偶爾回頭翻」的東西，
 * 常駐一整張卡會把個人頁真正每天要看的資訊（積分、徽章）往下推。
 *
 * 月份用月曆格而不是一串連結：一年 12 格掃一眼就找得到，用一年後也不會
 * 變成要捲很久的清單。帳號存在期間的月份一律可點——沒簽到的月份手冊照樣
 * 看得到（作息會是「忘記簽到型」），不必再用有沒有簽到紀錄去擋。
 */
export default function RecapMonthMenu({ createdAt, currentMonth, showTip }: Props) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tipDismissed, setTipDismissed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const tipVisible = showTip && !tipDismissed

  // 關掉提示卡，順便把網址上的 recapTip 沖掉——不然重新整理又會跳一次。
  const dismissTip = () => {
    setTipDismissed(true)
    router.replace('/profile', { scroll: false })
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const [fromY, fromM] = createdAt.slice(0, 7).split('-').map(Number)
  const [toY, toM] = currentMonth.split('-').map(Number)

  // 年份由新到舊：最近的月份是最常回頭看的，放最上面
  const years: { year: number; months: number[] }[] = []
  for (let year = toY; year >= fromY; year--) {
    const first = year === fromY ? fromM : 1
    const last = year === toY ? toM : 12
    if (last < first) continue
    years.push({ year, months: Array.from({ length: last - first + 1 }, (_, i) => first + i) })
  }

  // 只取月份名，不帶年——年份已經是分組標題了
  const monthName = new Intl.DateTimeFormat(getLocaleMeta(locale).htmlLang, { month: 'short' })

  return (
    // 外層和按鈕都用 flex：圖示包在 button 裡比旁邊的齒輪多一層巢狀，
    // 靠 inline 的基線對齊會被下緣空間推高，跟齒輪差幾 px。
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => { setOpen(v => !v); if (tipVisible) dismissTip() }}
        aria-expanded={open}
        aria-label={t('recap.sectionTitle')}
        // p-1.5 -m-1.5：圈圈需要空間才不會貼著圖示，用 padding 撐開再用等量負
        // margin 抵消，鄰居的齒輪圖示才不會被推位置。
        className={`flex items-center justify-center text-gray-400 hover:text-gray-600 active:opacity-50 rounded-full transition-[padding,margin] ${
          tipVisible ? 'p-1.5 -m-1.5 ring-2 ring-primary-dark ring-offset-2 recap-breathe' : ''
        }`}
      >
        <CalendarBlank size={22} />
      </button>

      {tipVisible && (
        <div className="fixed right-4 top-16 z-50 w-auto max-w-[220px] rounded-2xl border border-gray-100 bg-surface p-3.5 shadow-lg">
          <p className="text-sm text-gray-800 leading-relaxed">{t('recap.menuTipText')}</p>
          <button
            type="button"
            onClick={dismissTip}
            className="block ml-auto mt-2.5 text-sm font-semibold text-heading active:opacity-50"
          >
            {t('recap.menuTipGotIt')}
          </button>
        </div>
      )}

      {open && (
        <div className="fixed left-4 right-4 top-16 z-50 mx-auto w-auto max-w-[320px] rounded-2xl border border-gray-100 bg-surface p-4 shadow-lg">
          <p className="text-sm font-semibold text-heading mb-3">{t('recap.sectionTitle')}</p>

          <div className="space-y-3 max-h-[60dvh] overflow-y-auto">
            {years.map(({ year, months }) => (
              <div key={year}>
                <p className="text-xs text-gray-400 mb-1.5">{year}</p>
                <div className="grid grid-cols-4 gap-2">
                  {months.map(m => {
                    const key = `${year}-${String(m).padStart(2, '0')}`
                    const label = monthName.format(new Date(year, m - 1, 1))
                    return (
                      <Link
                        key={key}
                        href={`/recap/${key}`}
                        onClick={() => setOpen(false)}
                        className="text-center text-sm text-gray-900 bg-primary-light rounded-xl py-2 active:opacity-60 transition-opacity"
                      >
                        {label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
