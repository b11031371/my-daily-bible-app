const ROTATIONS = [-2, 3, -1, 2, -3, 1, -2, 3, -1, 2]

function TreeOfLife() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Stamp outer ring */}
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3.5 2" />
      {/* Trunk */}
      <path d="M24 39 L24 27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Roots */}
      <path d="M24 39 Q19 41 16 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 39 Q29 41 32 43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 39 Q21 42 20 44" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <path d="M24 39 Q27 42 28 44" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      {/* Left branches */}
      <path d="M24 31 Q18 28 13 27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 28 Q16 23 11 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 25 Q17 19 14 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right branches */}
      <path d="M24 31 Q30 28 35 27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 28 Q32 23 37 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 25 Q31 19 34 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Center top */}
      <path d="M24 25 L24 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Leaf clusters */}
      <circle cx="12" cy="26" r="3" fill="currentColor" />
      <circle cx="10" cy="20" r="2.5" fill="currentColor" />
      <circle cx="13" cy="14" r="3" fill="currentColor" />
      <circle cx="36" cy="26" r="3" fill="currentColor" />
      <circle cx="38" cy="20" r="2.5" fill="currentColor" />
      <circle cx="35" cy="14" r="3" fill="currentColor" />
      <circle cx="24" cy="9" r="3.5" fill="currentColor" />
      <circle cx="19" cy="12" r="2.5" fill="currentColor" />
      <circle cx="29" cy="12" r="2.5" fill="currentColor" />
      <circle cx="18" cy="19" r="2" fill="currentColor" />
      <circle cx="30" cy="19" r="2" fill="currentColor" />
      <circle cx="16" cy="23" r="1.8" fill="currentColor" opacity="0.7" />
      <circle cx="32" cy="23" r="1.8" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

interface Props {
  monthlyCount: number
  monthLabel: string
}

export default function StampCard({ monthlyCount, monthLabel }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">本月集點</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">{monthLabel}</span>
          <span className="text-xs font-bold text-gray-900">{monthlyCount}</span>
          <span className="text-xs text-gray-400">/ 10</span>
        </div>
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
                  <TreeOfLife />
                </div>
              ) : (
                <div className="w-full h-full text-gray-200">
                  <TreeOfLife />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {monthlyCount >= 10 && (
        <p className="text-center text-xs text-gray-900 font-semibold mt-3">🎉 本月集點已滿！</p>
      )}
      {monthlyCount > 0 && monthlyCount < 10 && (
        <p className="text-center text-xs text-gray-400 mt-3">還差 {10 - monthlyCount} 點集滿</p>
      )}
      {monthlyCount === 0 && (
        <p className="text-center text-xs text-gray-400 mt-3">今天簽到就能蓋第一個印章！</p>
      )}
    </div>
  )
}
