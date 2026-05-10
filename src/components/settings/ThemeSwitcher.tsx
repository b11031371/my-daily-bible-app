'use client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export type Theme = 'forest' | 'morning' | 'indigo'

const STORAGE_KEY = 'bible-theme'

const THEMES: { id: Theme; name: string; desc: string; swatches: string[] }[] = [
  {
    id: 'forest',
    name: '清新草綠',
    desc: '自然清爽，適合每日靈修',
    swatches: ['#3DB97A', '#FFD166', '#F2FAF6'],
  },
  {
    id: 'morning',
    name: '晨光暖橙',
    desc: '溫暖活力，像清晨的陽光',
    swatches: ['#FF7A50', '#FFB830', '#FFF9F6'],
  },
  {
    id: 'indigo',
    name: '靛紫現代',
    desc: '清晰沉穩，簡約現代感',
    swatches: ['#6C63FF', '#FFD166', '#F6F5FF'],
  },
]

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState<Theme>('forest')

  useEffect(() => {
    setCurrent((localStorage.getItem(STORAGE_KEY) as Theme) ?? 'forest')
  }, [])

  function select(theme: Theme) {
    setCurrent(theme)
    localStorage.setItem(STORAGE_KEY, theme)
    document.documentElement.setAttribute('data-theme', theme)
  }

  return (
    <div className="space-y-3">
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => select(t.id)}
          className={cn(
            'w-full flex items-center gap-4 bg-white rounded-2xl px-4 py-4 shadow-sm border-2 transition-colors text-left',
            current === t.id ? 'border-primary' : 'border-transparent'
          )}
        >
          {/* Swatches */}
          <div className="flex gap-1.5 shrink-0">
            {t.swatches.map((c, i) => (
              <div key={i} className="w-6 h-6 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
            ))}
          </div>
          {/* Label */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{t.name}</p>
            <p className="text-xs text-gray-400">{t.desc}</p>
          </div>
          {/* Check */}
          {current === t.id && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
