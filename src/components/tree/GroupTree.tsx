'use client'
import { useState } from 'react'
import { getTreeProgress, getFruitCount, FRUIT_I18N, type FruitKey } from '@/lib/tree'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  treePoints: number
  fruitOrder: string[]
  className?: string
  interactive?: boolean
  dormant?: boolean
}

function fade(p: number, from: number, to: number) {
  return Math.max(0, Math.min(1, (p - from) / (to - from)))
}

// V1 fruit positions (kept as-is — without labels they work fine in the canopy)
const FRUIT_POSITIONS = [
  { x: 80,  y: 93  },
  { x: 112, y: 85  },
  { x: 140, y: 103 },
  { x: 58,  y: 126 },
  { x: 148, y: 128 },
  { x: 74,  y: 152 },
  { x: 128, y: 155 },
  { x: 100, y: 162 },
  { x: 100, y: 112 },
]

export default function GroupTree({ treePoints, fruitOrder, className, interactive = false, dormant = false }: Props) {
  const { locale, t } = useI18n()
  const [selectedFruit, setSelectedFruit] = useState<number | null>(null)

  const p = getTreeProgress(treePoints)
  const fruitCount = getFruitCount(treePoints)

  const cx = 100
  const trunkBottom = 246
  const trunkHeight = 12 + 78 * p
  const trunkWidth  = 4  + 10 * p
  const trunkTop    = trunkBottom - trunkHeight
  const trunkX      = cx - trunkWidth / 2

  const branchOriginY = trunkTop + 22
  const leftEnd   = { x: cx - 40, y: trunkTop + 2 }
  const rightEnd  = { x: cx + 40, y: trunkTop + 2 }
  const leftLow   = { x: cx - 24, y: trunkTop + 38 }
  const rightLow  = { x: cx + 24, y: trunkTop + 38 }

  // Slightly adjusted fades — branches appear a bit later so early stages look cleaner
  const sproutLeafOp  = fade(p, 0.04, 0.22)
  const branchOp      = fade(p, 0.35, 0.62)
  const leafClusterOp = fade(p, 0.42, 0.72)
  const mainCanopyOp  = fade(p, 0.52, 0.82)
  const fullCanopyOp  = fade(p, 0.76, 1.00)
  const animating     = p >= 0.5 && !dormant

  const dormantFilter = dormant ? 'saturate(0) opacity(0.55)' : undefined

  const selectedFruitKey = selectedFruit !== null ? (fruitOrder[selectedFruit] ?? null) : null
  const selectedFruit_ = selectedFruitKey ? FRUIT_I18N[locale][selectedFruitKey as FruitKey] ?? null : null

  return (
    <div
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <svg
        viewBox="0 0 200 268"
        style={{ width: '100%', height: '100%', filter: dormantFilter, overflow: 'visible' }}
        aria-hidden="true"
        onClick={() => interactive && setSelectedFruit(null)}
      >
        {animating && (
          <defs>
            <style>{`
              @keyframes sproutiv-sway {
                0%,100% { transform: rotate(-1.4deg); }
                50%      { transform: rotate(1.4deg);  }
              }
              .sproutiv-canopy {
                animation: sproutiv-sway 4.5s ease-in-out infinite;
                transform-origin: ${cx}px ${trunkBottom}px;
              }
            `}</style>
          </defs>
        )}

        {/* Ground */}
        <ellipse cx={cx} cy={252} rx={72} ry={11} fill="#C8B8AC" />

        {/* Trunk — slight taper (V2 style) */}
        <path
          d={`M ${trunkX} ${trunkBottom} L ${trunkX + trunkWidth} ${trunkBottom} L ${trunkX + trunkWidth - 2} ${trunkTop} L ${trunkX + 2} ${trunkTop} Z`}
          fill="#5C3D2E"
        />

        <g className={animating ? 'sproutiv-canopy' : undefined}>

          {/* Sprout leaves (stage 1→2) */}
          <g opacity={sproutLeafOp}>
            <ellipse cx={cx - 10} cy={trunkTop + 6} rx={11} ry={8} fill="#9EDE9E" />
            <ellipse cx={cx + 13} cy={trunkTop + 3} rx={12} ry={8} fill="#7ECB7E" />
          </g>

          {/* Main branches */}
          <g opacity={branchOp}>
            <path d={`M ${cx} ${branchOriginY} Q ${cx-18} ${branchOriginY-8} ${leftEnd.x} ${leftEnd.y}`}
              stroke="#5C3D2E" strokeWidth={4} fill="none" strokeLinecap="round" />
            <path d={`M ${cx} ${branchOriginY} Q ${cx+18} ${branchOriginY-8} ${rightEnd.x} ${rightEnd.y}`}
              stroke="#5C3D2E" strokeWidth={4} fill="none" strokeLinecap="round" />
            <path d={`M ${cx-8} ${branchOriginY+18} L ${leftLow.x} ${leftLow.y}`}
              stroke="#5C3D2E" strokeWidth={3} fill="none" strokeLinecap="round" />
            <path d={`M ${cx+8} ${branchOriginY+18} L ${rightLow.x} ${rightLow.y}`}
              stroke="#5C3D2E" strokeWidth={3} fill="none" strokeLinecap="round" />
          </g>

          {/* Leaf clusters at branch ends */}
          <g opacity={leafClusterOp}>
            <circle cx={leftEnd.x}  cy={leftEnd.y}  r={22} fill="#61AF61" />
            <circle cx={rightEnd.x} cy={rightEnd.y} r={22} fill="#4E9450" />
            <circle cx={leftLow.x}  cy={leftLow.y}  r={15} fill="#7ECB7E" />
            <circle cx={rightLow.x} cy={rightLow.y} r={15} fill="#61AF61" />
          </g>

          {/* Main canopy — V1 positions, slightly larger radii, V2 colors */}
          <g opacity={mainCanopyOp}>
            <circle cx={cx}      cy={132} r={50} fill="#61AF61" />
            <circle cx={cx - 32} cy={150} r={34} fill="#4E9450" />
            <circle cx={cx + 32} cy={150} r={34} fill="#61AF61" />
          </g>

          {/* Full canopy overlay + crown cap */}
          <g opacity={fullCanopyOp}>
            <circle cx={cx}      cy={98}  r={30} fill="#7ECB7E" />
            <circle cx={cx - 50} cy={148} r={24} fill="#4E9450" />
            <circle cx={cx + 50} cy={148} r={24} fill="#61AF61" />
            <circle cx={cx - 24} cy={112} r={22} fill="#7ECB7E" />
            <circle cx={cx + 24} cy={112} r={22} fill="#61AF61" />
            <circle cx={cx}      cy={82}  r={20} fill="#9EDE9E" />
          </g>

          {/* Holy Spirit Fruits */}
          {FRUIT_POSITIONS.map((pos, i) => (
            <g
              key={i}
              style={{
                opacity: i < fruitCount ? 1 : 0,
                transition: 'opacity 1.2s ease',
                cursor: interactive && i < fruitCount ? 'pointer' : 'default',
              }}
              onClick={e => {
                if (!interactive || i >= fruitCount) return
                e.stopPropagation()
                setSelectedFruit(selectedFruit === i ? null : i)
              }}
            >
              <circle cx={pos.x} cy={pos.y} r={13} fill={selectedFruit === i ? '#C4432A' : '#E8593A'} />
              <circle cx={pos.x - 4} cy={pos.y - 4} r={3.5} fill="rgba(255,255,255,0.4)" />
            </g>
          ))}
        </g>
      </svg>

      {/* Fruit info card */}
      {interactive && selectedFruit !== null && selectedFruit_ && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translate(-50%, calc(100% + 10px))',
            zIndex: 50,
          }}
          className="bg-surface rounded-2xl shadow-xl px-4 py-3 w-52 text-center"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] text-gray-400 mb-0.5">{t('tree.fruitOfSpirit')}</p>
          <p className="text-base font-bold text-gray-900 mb-2">{selectedFruit_.name}</p>
          <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{selectedFruit_.verse}</p>
        </div>
      )}
    </div>
  )
}
