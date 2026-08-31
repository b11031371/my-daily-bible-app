'use client'
import { useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { COUNT_SLOT, withSlot } from '@/components/recap/CountSlot'
import { formatMonth } from '@/lib/utils'
import RecapBook, { type BookPage } from '@/components/recap/RecapBook'
import RecapPage from '@/components/recap/RecapPage'
import { FrontCover, BackCover } from '@/components/recap/RecapCover'
import RecapCalendar from '@/components/recap/RecapCalendar'
import { StatsPage } from '@/components/recap/RecapHighlights'
import RecapSummaryPage, { useBookSummary } from '@/components/recap/RecapSummaryPage'
import RecapTreePage from '@/components/recap/RecapTreePage'
import type { MonthRecap } from '@/lib/recap'

/**
 * 回顧的內容本體，彈窗和 /recap/[month] 頁面共用同一份。
 *
 * 是 client component 因為要用 useI18n()；從伺服器元件渲染沒問題，MonthRecap
 * 全是可序列化的字串／數字／陣列。
 */
export default function RecapContent({ recap }: { recap: MonthRecap }) {
  const { t } = useI18n()
  // 封面的鎖：翻開之前都是上鎖的，解開後不再回鎖（翻回封面也是開的）
  const [unlocked, setUnlocked] = useState(false)
  // 摘要在這裡就開始生成，使用者還在看封面和日曆的時候它已經在跑了。
  // 留在摘要頁自己抓的話，那頁要等翻到才掛載，等於一定會看到骨架。
  const summary = useBookSummary(recap.month, recap.reflectionCount > 0)

  // 內頁維持兩頁：一頁走過的路、一頁走出來的東西。
  // 一項一頁會讓手冊變成一疊只有一句話的卡，翻起來很空。
  const pages: BookPage[] = [
    { key: 'front', node: <FrontCover month={recap.month} unlocked={unlocked} /> },
    { key: 'calendar', node: <CalendarPage recap={recap} page={1} /> },
  ]
  // 統計頁四段一律顯示（見 RecapHighlights），所以這頁不再需要有資料才出現。
  pages.push({ key: 'stats', node: <StatsPage recap={recap} page={2} /> })
  // 摘要頁排在統計之後、種樹之前：先是自己寫下的，再是跟大家一起的成果。
  // 沒寫反思也放這頁——用來鼓勵下個月開始寫，不是只有寫了才看得到。
  pages.push({
    key: 'summary',
    node: (
      <RecapSummaryPage
        page={pages.length}
        summary={summary}
        hasReflections={recap.reflectionCount > 0}
      />
    ),
  })
  // 頁碼接在前面幾頁後面，所以用 pages.length 推算（封面不算頁）。
  for (const g of recap.groups) {
    pages.push({ key: `tree-${g.id}`, node: <RecapTreePage group={g} page={pages.length} /> })
  }
  pages.push({ key: 'back', node: <BackCover name={recap.displayName} /> })

  return (
    <div>
      <RecapBook pages={pages} locked={!unlocked} onUnlock={() => setUnlocked(true)} />
      {/* 鎖是很強的暗示，但還是要說一次「點了會怎樣」。解開後就沒有存在的必要。 */}
      {!unlocked && (
        <p className="recap-breathe text-center text-[11px] text-gray-400 mt-2">{t('recap.unlockHint')}</p>
      )}
    </div>
  )
}

function CalendarPage({ recap, page }: { recap: MonthRecap; page: number }) {
  const { t, locale } = useI18n()

  return (
    <RecapPage page={page}>
      <div>
        <p className="text-xs text-gray-500">{formatMonth(recap.month, locale)}</p>
        {/* 句子小、數字大：一眼抓到的是天數，而不是整句話 */}
        <p className="text-sm text-gray-700 mt-0.5">
          {/* 同 BigNumber：改用襯線字真正的 600 字重，不用文楷合成的假 900 */}
          {withSlot(
            t('recap.headline', { name: recap.displayName, days: COUNT_SLOT }),
            <span className="recap-figure text-3xl font-black text-heading align-baseline mx-1 tabular-nums">
              {recap.checkinDays}
            </span>
          )}
        </p>
      </div>

      <RecapCalendar recap={recap} />
    </RecapPage>
  )
}
