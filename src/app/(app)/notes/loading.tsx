'use client'
import { Plant } from '@phosphor-icons/react'
import HomeScenery from '@/components/notes/HomeScenery'
import { useI18n } from '@/components/i18n/I18nProvider'
import Card from '@/components/ui/Card'

// 骨架照首頁的版面排（見 notes/page.tsx）：同一片天空與遠山、標題在同一個位置，
// 換成真畫面時內容不會跳，只多了太陽／月亮從山後升起。
// 用 client component 是為了拿 useI18n 顯示標題，不必在載入畫面讀 cookie。
const bar = 'rounded-md bg-gray-300/55'
const darkBar = 'rounded-md bg-black/10'

export default function NotesLoading() {
  const { t } = useI18n()
  return (
    <HomeScenery celestial={false} className="max-w-lg mx-auto px-4 pt-6 pb-2 space-y-4">
      <div aria-hidden="true" className="h-22" />
      <h1 className="sky-title page-title font-bold text-heading">{t('notesList.title')}</h1>

      {/* Hero card：保留主題漸層，調淡 */}
      <div className="home-reading-card rounded-3xl bg-primary/45 p-[2px]">
        <div className="btn-gradient rounded-[22px] p-6 opacity-60 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className={`h-6 w-11 rounded-full ${darkBar}`} />
            <div className={`h-4 w-24 ${darkBar}`} />
          </div>
          <div className={`h-7 w-48 mb-4 ${darkBar}`} />
          <div className={`h-5 w-20 ${darkBar}`} />
        </div>
      </div>

      {/* Streak + week */}
      <Card padding="sm" className="glass-card glass-blur">
        <div className="mb-3 flex items-center justify-between animate-pulse">
          <div className={`h-6 w-24 ${bar}`} />
          <div className={`h-3 w-12 ${bar}`} />
        </div>
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 animate-pulse">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 py-2">
              <span className="flex h-10 w-10 max-w-full items-center justify-center">
                <Plant size={26} color="var(--color-gray-300)" aria-hidden="true" />
              </span>
              <span className={`h-[22px] w-4 ${bar}`} />
            </div>
          ))}
        </div>
      </Card>

      {/* Quick checkin */}
      <div className="h-14 rounded-2xl btn-gradient opacity-40 animate-pulse" />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="none" className="glass-card p-3 animate-pulse">
            <div className={`h-[22px] w-[22px] rounded-full mx-auto mb-1 ${bar}`} />
            <div className={`h-5 w-7 mx-auto mb-1 ${bar}`} />
            <div className={`h-2.5 w-12 mx-auto ${bar}`} />
          </Card>
        ))}
      </div>

      {/* Past notes */}
      <div>
        <div className={`h-3 w-14 mb-2 mx-1 ${bar}`} />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="none" className="glass-card px-5 py-3.5 animate-pulse">
              <div className={`h-4 w-24 ${bar}`} />
              <div className={`h-3 w-32 mt-2 ${bar}`} />
            </Card>
          ))}
        </div>
      </div>
    </HomeScenery>
  )
}
