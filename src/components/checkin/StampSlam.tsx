import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import TreeOfLifeStamp from './TreeOfLifeStamp'

// 碎片的顏色輪流取主題的漸層色和輔色，換主題時跟著變
const BURST_COLORS = ['var(--color-grad-from)', 'var(--color-primary)', 'var(--color-accent)', 'var(--color-grad-to)']
const BURST = Array.from({ length: 12 }, (_, i) => ({
  angle: `${i * 30 + (i % 2 ? 8 : -6)}deg`,
  distance: `${38 + (i % 3) * 12}px`,
  color: BURST_COLORS[i % 4],
  round: i % 3 === 0,
}))

/**
 * 簽到成功時蓋下去的生命樹印章：印章砸下來、墨水圈擴散、碎片噴出（動畫見 globals.css 的「簽到動畫」）。
 * 只在剛簽到的那一刻掛上去；已簽到的靜態狀態不要用它，否則每次進頁面都會重播。
 * 大小由 className 決定（例如 w-7 h-7），顏色跟著 currentColor。
 */
export default function StampSlam({ className, rotate = 0, burst = true }: { className?: string; rotate?: number; burst?: boolean }) {
  return (
    <span aria-hidden="true" className={cn('relative inline-block shrink-0', className)}>
      <span className="stamp-slam block w-full h-full" style={{ '--r': `${rotate}deg` } as CSSProperties}>
        <TreeOfLifeStamp />
      </span>
      <span className="ink-ring" />
      {burst && (
        <span className="stamp-burst">
          {BURST.map((p, i) => (
            <i
              key={i}
              style={{ '--a': p.angle, '--d': p.distance, background: p.color, borderRadius: p.round ? '50%' : undefined } as CSSProperties}
            />
          ))}
        </span>
      )}
    </span>
  )
}
