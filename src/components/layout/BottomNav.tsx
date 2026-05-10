'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/notes',     label: '筆記',  icon: '📖' },
  { href: '/checkin',   label: '簽到',  icon: '✅' },
  { href: '/community', label: '社群',  icon: '💬' },
  { href: '/profile',   label: '個人',  icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(tab => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors',
              active ? 'text-[#4a7c59]' : 'text-gray-400'
            )}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className={cn('font-medium', active && 'font-semibold')}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
