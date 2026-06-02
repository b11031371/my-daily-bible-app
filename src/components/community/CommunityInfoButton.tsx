'use client'
import { useState, useEffect, useRef } from 'react'

export default function CommunityInfoButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 text-xs font-bold flex items-center justify-center hover:border-gray-400 hover:text-gray-500 transition-colors"
      >
        ?
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-50 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-700 mb-3">種樹積分來源</p>
          <div className="space-y-2">
            {[
              { label: '每日簽到（當天）', points: '+10 分' },
              { label: '補簽（前 1 天）', points: '+7 分' },
              { label: '補簽（前 2 天）', points: '+5 分' },
              { label: '補簽（前 3 天）', points: '+3 分' },
              { label: '反思留言（首則）', points: '+5 分' },
              { label: '徽章獎勵', points: '依徽章' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{r.label}</span>
                <span className="text-xs font-medium text-gray-800">{r.points}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
            當月各成員積分合計即為群組的種樹貢獻
          </p>
        </div>
      )}
    </div>
  )
}
