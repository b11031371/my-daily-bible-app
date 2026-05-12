'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BookOpen, SealCheck, ChatCircle, UserCircle } from '@phosphor-icons/react'

const tabs = [
  { href: '/notes',     label: '筆記',  Icon: BookOpen },
  { href: '/checkin',   label: '簽到',  Icon: SealCheck },
  { href: '/community', label: '社群',  Icon: ChatCircle },
  { href: '/profile',   label: '個人',  Icon: UserCircle },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    tabs.forEach(({ href }) => router.prefetch(href))
  }, [])

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors',
              active ? 'text-gray-900' : 'text-gray-400'
            )}
          >
            <Icon size={24} weight={active ? 'fill' : 'regular'} />
            <span className={cn('font-medium', active && 'font-semibold')}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
