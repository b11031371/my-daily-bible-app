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

  // 指示條只有一條，切分頁時滑到新位置（時間跟換頁過場一樣）；不在四個分頁裡的頁面（設定、測驗）不顯示
  const activeIndex = tabs.findIndex(({ href }) => pathname.startsWith(href))

  return (
    <nav aria-label={t('nav.main')} className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-100 flex z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)', viewTransitionName: 'bottom-nav' }}>
      {tabs.map(({ href, labelKey, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            transitionTypes={['tab']}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative min-h-14 flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors',
              active ? 'text-gray-900' : 'text-gray-400'
            )}
          >
            <Icon size={24} weight={active ? 'fill' : 'regular'} />
            <span className={cn('font-medium', active && 'font-semibold')}>{t(labelKey)}</span>
          </Link>
        )
      })}
      {activeIndex >= 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 flex w-1/4 justify-center transition-transform duration-[400ms] ease-[cubic-bezier(.3,.7,.3,1)] motion-reduce:transition-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.125rem)', transform: `translateX(${activeIndex * 100}%)` }}
        >
          <span className="h-0.5 w-8 rounded-full bg-primary-dark" />
        </span>
      )}
    </nav>
  )
}
