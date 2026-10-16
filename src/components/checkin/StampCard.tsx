import { useI18n } from '@/components/i18n/I18nProvider'
import { Confetti } from '@phosphor-icons/react'
import TreeOfLifeStamp from './TreeOfLifeStamp'

const ROTATIONS = [-2, 3, -1, 2, -3, 1, -2, 3, -1, 2]


interface Props {
  monthlyCount: number
  monthLabel: string
}

export default function StampCard({ monthlyCount, monthLabel }: Props) {
  const { t } = useI18n()
  return (
    <div className="bg-surface rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-heading">{t('checkin.stampTitle')}</h3>
        <span className="text-xs text-gray-400">{monthLabel}</span>
      </div>

      {/* Stamp grid */}
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => {
          const filled = i < monthlyCount
          const rotation = ROTATIONS[i]
          return (
            <div
              key={i}
              className="aspect-square flex items-center justify-center"
              style={{ transform: filled ? `rotate(${rotation}deg)` : 'none' }}
            >
              {filled ? (
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

      {monthlyCount >= 10 && (
        <p className="flex items-center justify-center gap-1 text-xs text-gray-900 font-semibold mt-3">
          <Confetti size={14} weight="fill" className="text-heading" />
          {t('checkin.stampFull')}
        </p>
      )}
      {monthlyCount > 0 && monthlyCount < 10 && (
        <p className="text-center text-xs text-gray-400 mt-3">{t('checkin.stampRemaining', { count: 10 - monthlyCount })}</p>
      )}
      {monthlyCount === 0 && (
        <p className="text-center text-xs text-gray-400 mt-3">{t('checkin.stampFirst')}</p>
      )}
    </div>
  )
}
