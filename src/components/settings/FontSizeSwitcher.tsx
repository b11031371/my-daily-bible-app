'use client'
import { useState } from 'react'

const OPTIONS = [
  { size: '14px', desc: '小',   textClass: 'text-xs'  },
  { size: '16px', desc: '標準', textClass: 'text-sm'  },
  { size: '18px', desc: '大',   textClass: 'text-base'},
  { size: '20px', desc: '特大', textClass: 'text-lg'  },
]

export default function FontSizeSwitcher() {
  const [current, setCurrent] = useState<string>(() => {
    if (typeof window === 'undefined') return '16px'
    return localStorage.getItem('bible-font-size') ?? '16px'
  })

  function apply(size: string) {
    document.documentElement.style.fontSize = size
    try { localStorage.setItem('bible-font-size', size) } catch {}
    setCurrent(size)
  }

  return (
    <div className="bg-white rounded-2xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">字體大小</p>
      <div className="flex gap-2">
        {OPTIONS.map(opt => {
          const active = current === opt.size
          return (
            <button
              key={opt.size}
              onClick={() => apply(opt.size)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors ${
                active
                  ? 'bg-amber-50 border-amber-400 text-amber-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className={`${opt.textClass} font-bold leading-none`}>A</span>
              <span className="text-[10px]">{opt.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
