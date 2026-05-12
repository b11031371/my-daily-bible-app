'use client'
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Badge { id: string; name_zh: string; icon: string }
interface Ctx { showBadges: (ids: string[]) => void }

const ToastCtx = createContext<Ctx>({ showBadges: () => {} })
export function useBadgeToast() { return useContext(ToastCtx) }

// ─── Toast UI ────────────────────────────────────────────────────────────────

function BadgeToast({
  badges, visible, onDismiss,
}: {
  badges: Badge[]; visible: boolean; onDismiss: () => void
}) {
  const touchY = useRef(0)

  if (!badges.length) return null

  return (
    <div
      className={`fixed inset-x-3 top-3 z-[200] transition-all duration-300 ease-out max-w-md mx-auto
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-[130%] opacity-0 pointer-events-none'}`}
      onTouchStart={e => { touchY.current = e.touches[0].clientY }}
      onTouchEnd={e => { if (touchY.current - e.changedTouches[0].clientY > 28) onDismiss() }}
    >
      <div className="animated-border rounded-2xl shadow-xl">
        <div className="bg-white rounded-[14px] px-4 py-3 space-y-2.5">
          <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">徽章解鎖</p>
          {badges.map(b => (
            <div key={b.id} className="flex items-center gap-3">
              <span className="text-3xl leading-none">{b.icon}</span>
              <p className="flex-1 text-sm font-bold text-gray-900">{b.name_zh}</p>
              <span className="text-xs text-gray-400 shrink-0">✓</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BadgeToastProvider({ children }: { children: React.ReactNode }) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(null)

  const showBadges = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    const supabase = createClient()
    const { data } = await supabase
      .from('badges')
      .select('id, name_zh, icon')
      .in('id', ids)
    if (!data?.length) return

    setBadges(data)
    setVisible(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={{ showBadges }}>
      {children}
      <BadgeToast
        badges={badges}
        visible={visible}
        onDismiss={() => setVisible(false)}
      />
    </ToastCtx.Provider>
  )
}
