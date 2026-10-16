'use client'
import { useLayoutEffect, useState } from 'react'
import { Plant } from '@phosphor-icons/react'
import { readProgress } from '@/lib/reading-progress'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  userId: string
  date: string
  readLabel: string
  progressLabel: string
}

/**
 * 首頁今日卡片的閱讀進度：卡片底邊一條淡底軌，已讀的部分加深，線尾一棵嫩芽跟著往右長，
 * 「閱讀今日筆記 ›」那一行最右邊一個小小的百分比。進度是筆記頁存下的「最高進度」（只進不退），
 * 0% 也照樣顯示。
 *
 * 這些都用 absolute 貼在卡片底邊，外層卡片要有 relative overflow-hidden（見 notes/page.tsx），
 * 底軌和線才會被卡片的圓角裁切。
 */
export default function TodayReadingProgress({ userId, date, readLabel, progressLabel }: Props) {
  const { t } = useI18n()
  const [max, setMax] = useState(0)
  const [width, setWidth] = useState(0)
  // 讀到裝置上的進度之前不畫：整頁載入時伺服器讀不到 localStorage，先畫的話會閃一個錯的 0%
  const [loaded, setLoaded] = useState(false)

  // 在畫面畫出來之前讀進度，免得先畫一次空的再跳
  useLayoutEffect(() => {
    const value = readProgress(userId, date).max
    setMax(value)
    setLoaded(true)
    // 先以 0 畫出來，下一幀再拉到實際長度，線和嫩芽才會有長出來的過程
    const frame = requestAnimationFrame(() => setWidth(value))
    return () => cancelAnimationFrame(frame)
  }, [userId, date])

  // 卡片底是固定的亮色漸層：線、嫩芽、數字都用低透明度的深咖啡色（同 .btn-gradient 的字色），
  // 看得出進度又不搶標題的眼；顏色寫死，深色模式也不反轉
  return (
    <>
      {/* 百分比放在這一行最右邊：放在底邊的話，讀到 100% 時會跟線尾的嫩芽撞在一起 */}
      <div className="flex items-center gap-1 text-sm text-black/60 font-medium">
        <span>{!loaded ? readLabel : t(max >= 100 ? 'notesList.readAgain' : max > 0 ? 'notesList.continueReading' : 'notesList.startReading')}</span>
        <span>›</span>
        {loaded && (
          <span aria-hidden="true" className="ml-auto text-xs font-semibold tabular-nums text-black/55">
            {max}%
          </span>
        )}
      </div>
      {loaded && (
        <>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#2C1A0E]/10" />
          <span
            role="progressbar"
            aria-label={progressLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={max}
            className={`absolute bottom-0 left-0 h-1 bg-[#2C1A0E]/40 transition-[width] duration-700 ease-out ${max >= 100 ? '' : 'rounded-r-full'}`}
            style={{ width: `${width}%` }}
          />
          {/* 嫩芽站在線尾；到兩端時夾住，不被卡片圓角切掉 */}
          <Plant
            aria-hidden="true"
            size={15}
            weight="fill"
            className="absolute bottom-[3px] text-[#2C1A0E]/60 transition-[left] duration-700 ease-out"
            style={{ left: `clamp(4px, calc(${width}% - 7px), calc(100% - 19px))` }}
          />
        </>
      )}
    </>
  )
}
