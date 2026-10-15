'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowClockwise, BookOpenText, CloudRain, FileDashed, Plant } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'

type ErrorStateProps = {
  kind: 'not-found' | 'error'
  onRetry?: () => void
}

export default function ErrorState({ kind, onRetry }: ErrorStateProps) {
  const router = useRouter()
  const { t } = useI18n()
  const isNotFound = kind === 'not-found'

  return (
    <section
      className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-lg flex-col items-center justify-center px-6 py-12 text-center"
      aria-labelledby="error-state-title"
      {...(!isNotFound ? { role: 'alert' as const } : {})}
    >
      <div className="relative mb-8 flex h-52 w-full max-w-sm items-center justify-center overflow-hidden rounded-[2rem] bg-primary-light">
        <span aria-hidden="true" className="absolute -left-8 bottom-0 h-28 w-48 rounded-[50%] bg-primary/20" />
        <span aria-hidden="true" className="absolute -right-10 bottom-1 h-24 w-52 rounded-[50%] bg-primary/25" />
        {isNotFound ? (
          <FileDashed aria-hidden="true" size={52} weight="duotone" className="absolute right-10 top-7 rotate-6 text-heading opacity-60" />
        ) : (
          <CloudRain aria-hidden="true" size={64} weight="duotone" className="absolute top-5 text-heading opacity-60" />
        )}
        <BookOpenText aria-hidden="true" size={126} weight="duotone" className="relative mt-12 text-heading" />
        <Plant aria-hidden="true" size={54} weight="duotone" className="absolute bottom-12 text-heading" />
      </div>

      <h1 id="error-state-title" className="page-title text-balance font-bold text-gray-900">
        {t(isNotFound ? 'errors.notFoundTitle' : 'errors.loadTitle')}
      </h1>
      <p className="mt-3 max-w-sm text-pretty text-sm leading-6 text-gray-500">
        {t(isNotFound ? 'errors.notFoundBody' : 'errors.loadBody')}
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        {isNotFound ? (
          <Link href="/notes" className="btn-gradient inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold text-gray-900 hover:brightness-95">
            {t('errors.todayNotes')}
          </Link>
        ) : (
          <button type="button" onClick={onRetry} className="btn-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold text-gray-900 hover:brightness-95">
            <ArrowClockwise aria-hidden="true" size={20} weight="bold" />
            {t('errors.retry')}
          </button>
        )}
        {isNotFound ? (
          <button type="button" onClick={() => router.back()} className="min-h-11 rounded-xl px-4 text-sm font-medium text-gray-600 underline decoration-primary-dark/50 underline-offset-4">
            {t('errors.previousPage')}
          </button>
        ) : (
          <Link href="/notes" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-gray-600 underline decoration-primary-dark/50 underline-offset-4">
            {t('errors.todayNotes')}
          </Link>
        )}
      </div>
    </section>
  )
}
