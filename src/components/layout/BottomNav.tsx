'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/i18n/I18nProvider'
import { BookOpen, SealCheck, ChatCircle, UserCircle } from '@phosphor-icons/react'

const tabs = [
  { href: '/notes',     labelKey: 'nav.notes',     Icon: BookOpen },
  { href: '/checkin',   labelKey: 'nav.checkin',   Icon: SealCheck },
  { href: '/community', labelKey: 'nav.community', Icon: ChatCircle },
  { href: '/profile',   labelKey: 'nav.profile',   Icon: UserCircle },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()

  useEffect(() => {
    tabs.forEach(({ href }) => router.prefetch(href))
  }, [])

  return (
    <nav aria-label={t('nav.main')} className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-100 flex z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(({ href, labelKey, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative min-h-14 flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors',
              active ? 'text-gray-900' : 'text-gray-400'
            )}
          >
            <Icon size={24} weight={active ? 'fill' : 'regular'} />
            <span className={cn('font-medium', active && 'font-semibold')}>{t(labelKey)}</span>
            {active && <span aria-hidden="true" className="absolute bottom-0.5 h-0.5 w-8 rounded-full bg-primary-dark" />}
          </Link>
        )
      })}
    </nav>
  )
}
