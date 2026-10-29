import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Confetti } from '@phosphor-icons/react'
import TreeOfLifeStamp from './TreeOfLifeStamp'
import StampSlam from './StampSlam'

const ROTATIONS = [-2, 3, -1, 2, -3, 1, -2, 3, -1, 2]


interface Props {
  monthlyCount: number
  monthLabel: string
}

export default function StampCard({ monthlyCount, monthLabel }: Props) {
  const { t } = useI18n()
  // 簽到後 router.refresh 帶回較大的 monthlyCount：新的那幾格播蓋章動畫、卡片咚一下。
  // 等今日卡片的印章先蓋完（約 .75s）才換這裡，在那之前新格子維持空的。第一次畫出來不播
  const [shown, setShown] = useState(monthlyCount)
  const [fresh, setFresh] = useState<{ from: number; to: number } | null>(null)
  const prevCount = useRef(monthlyCount)
  useEffect(() => {
    const from = prevCount.current
    prevCount.current = monthlyCount
    if (monthlyCount <= from) {
      setShown(monthlyCount)
      return
    }
    const timer = setTimeout(() => {
      setFresh({ from, to: monthlyCount })
      setShown(monthlyCount)
    }, 750)
    return () => clearTimeout(timer)
  }, [monthlyCount])

  return (
    // key 跟著 fresh 換：同一張卡片連續簽到（例如補簽）時，咚一下的動畫能再播一次
    <div key={fresh?.to ?? 'idle'} className={`bg-surface rounded-2xl p-5 shadow-sm ${fresh ? 'stamp-thud' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-heading">{t('checkin.stampTitle')}</h3>
        <span className="text-xs text-gray-400">{monthLabel}</span>
      </div>

      {/* Stamp grid */}
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => {
          const filled = i < shown
          const rotation = ROTATIONS[i]
          const stamping = !!fresh && i >= fresh.from && i < fresh.to
          return (
            <div
              key={i}
              className="aspect-square flex items-center justify-center"
              // 正在蓋的格子由 StampSlam 自己轉到同樣的角度
              style={{ transform: filled && !stamping ? `rotate(${rotation}deg)` : 'none' }}
            >
              {stamping ? (
                <StampSlam rotate={rotation} burst={false} className="w-full h-full text-primary drop-shadow-sm" />
              ) : filled ? (
                <div className="w-full h-full text-primary drop-shadow-sm">
                  <TreeOfLifeStamp />
                </div>
              ) : (
                <div className="w-full h-full text-gray-200">
                  <TreeOfLifeStamp />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {shown >= 10 && (
        <p className="flex items-center justify-center gap-1 text-xs text-gray-900 font-semibold mt-3">
          <Confetti size={14} weight="fill" className="text-heading" />
          {t('checkin.stampFull')}
        </p>
      )}
      {shown > 0 && shown < 10 && (
        <p key={shown} className={`text-center text-xs text-gray-400 mt-3 ${fresh ? 'num-in w-full [animation-delay:.35s]' : ''}`}>
          {t('checkin.stampRemaining', { count: 10 - shown })}
        </p>
      )}
      {shown === 0 && (
        <p className="text-center text-xs text-gray-400 mt-3">{t('checkin.stampFirst')}</p>
      )}
    </div>
  )
}
