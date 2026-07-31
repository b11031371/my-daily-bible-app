'use client'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Footprints } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { localizeBibleRange } from '@/lib/bible-books'
import { formatDate } from '@/lib/utils'
import type { MonthRecap, RecapDay } from '@/lib/recap'

/**
 * 印章的傾斜角。用日期算出來而不是 Math.random()，同一天每次重繪才會長得一樣——
 * 蓋過的印子不會自己轉方向。
 */
function tiltOf(day: number): number {
  return ((day * 37) % 23) - 11
}

// 格線用同一組 class，補白格和日期格才對得齊。只留橫線（帳本式）：
// 直線＋橫線的完整網格讀起來是表格，這本手冊裡別的地方沒有這種東西。
// 線也降到 /50，跟印章的手繪感比起來，滿版的實線網格太硬。
const CELL = 'relative aspect-square flex items-center justify-center border-b border-gray-200/50'

export default function RecapCalendar({ recap }: { recap: MonthRecap }) {
  const { t, locale } = useI18n()
  const [selected, setSelected] = useState<RecapDay | null>(null)

  // 日 → 那天的資料。日曆是 1..daysInMonth 逐格畫，查表比每格 find 省事也好讀。
  const byDay = new Map(recap.days.map(d => [d.day, d]))

  // 月底補到整列，格線才是完整的矩形而不是缺一角
  const trailing = (7 - ((recap.firstWeekday + recap.daysInMonth) % 7)) % 7

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="text-center text-[10px] text-gray-500">
            {t(`recap.weekday${i}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-t border-gray-200/50">
        {/* 1 號前面補空格，讓它落在正確的星期欄 */}
        {Array.from({ length: recap.firstWeekday }).map((_, i) => (
          <div key={`lead-${i}`} className={CELL} aria-hidden="true" />
        ))}

        {Array.from({ length: recap.daysInMonth }, (_, i) => i + 1).map(day => {
          const d = byDay.get(day)
          const isSelected = selected?.day === day
          // --i 讓格子依序長出來，延遲算在 CSS 裡（見 globals.css 的 .recap-cell）
          const style = {
            '--i': recap.firstWeekday + day - 1,
            '--tilt': tiltOf(day),
          } as CSSProperties
          const base = `recap-cell ${CELL} ${isSelected ? 'recap-circled' : ''}`

          // 未簽到的日子不可點：點開只會是一片空白，反而讓人以為壞了。
          return d ? (
            <button
              key={day}
              type="button"
              style={style}
              aria-pressed={isSelected}
              aria-label={formatDate(d.date, locale)}
              onClick={() => setSelected(isSelected ? null : d)}
              className={`${base} active:opacity-60 transition-opacity`}
            >
              {/* 補簽的印子淡一階：一樣是走過，只是後來才補上的 */}
              <Footprints
                size={22}
                weight="fill"
                className={`recap-stamp ${d.isRetro ? 'text-primary-dark/45' : 'text-primary-dark/85'}`}
              />
              {d.hasReflection && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent" aria-hidden="true" />
              )}
            </button>
          ) : (
            // 日期數字不套傾斜：印章歪是手蓋的感覺，印好的日期歪只會像沒對齊。
            <div key={day} style={style} className={base}>
              <span className="text-[11px] text-gray-400">{day}</span>
            </div>
          )
        })}

        {Array.from({ length: trailing }).map((_, i) => (
          <div key={`tail-${i}`} className={CELL} aria-hidden="true" />
        ))}
      </div>

      {/* 圖例緊貼日曆下方，看格子的時候視線不用跑遠 */}
      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-gray-500 mt-1.5">
        <Legend label={t('recap.legendDaily')}>
          <Footprints size={13} weight="fill" className="text-primary-dark/85" />
        </Legend>
        <Legend label={t('recap.legendRetro')}>
          <Footprints size={13} weight="fill" className="text-primary-dark/45" />
        </Legend>
        <Legend label={t('recap.legendNone')}>
          <span className="w-3.5 text-center text-[10px] text-gray-400 leading-none">7</span>
        </Legend>
        <Legend label={t('recap.legendReflection')}>
          <span className="w-3.5 flex justify-center">
            <span className="w-1 h-1 rounded-full bg-accent" />
          </span>
        </Legend>
      </div>

      {/* 選到的那天。固定最小高度，點來點去時底下不會上下跳。 */}
      <div className="mt-2.5 min-h-10">{selected && <DayDetail day={selected} />}</div>
    </div>
  )
}

function Legend({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden="true" className="inline-flex">{children}</span>
      {label}
    </span>
  )
}

function DayDetail({ day }: { day: RecapDay }) {
  const { t, locale } = useI18n()
  const range = localizeBibleRange(day.bibleRange, locale)

  return (
    <div className="border-l-2 border-primary-dark/40 pl-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-900">{formatDate(day.date, locale)}</span>
        {day.isRetro && <span className="text-[10px] text-gray-500">{t('recap.legendRetro')}</span>}
      </div>
      {/* note_meta 還沒抓到範圍的日子就只顯示日期，不要留一行空的 */}
      {range && <p className="text-sm text-heading mt-0.5">{range}</p>}
    </div>
  )
}
