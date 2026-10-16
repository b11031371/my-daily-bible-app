'use client'

import { useLayoutEffect, useState } from 'react'
import { BookOpen, NotePencil } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { readProgress } from '@/lib/reading-progress'

export default function RecentNoteStatus({ userId, date, hasReflection }: {
  userId: string
  date: string
  hasReflection: boolean
}) {
  const { t } = useI18n()
  const [read, setRead] = useState(false)

  useLayoutEffect(() => {
    const update = () => setRead(readProgress(userId, date).max >= 100)
    update()
    window.addEventListener('storage', update)
    window.addEventListener('focus', update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener('focus', update)
    }
  }, [userId, date])

  if (!read && !hasReflection) return null

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-heading">
      {read && (
        <span role="img" aria-label={t('notesList.readComplete')} title={t('notesList.readComplete')}>
          <BookOpen size={15} weight="fill" aria-hidden="true" />
        </span>
      )}
      {hasReflection && (
        <span role="img" aria-label={t('notesList.reflectionComplete')} title={t('notesList.reflectionComplete')}>
          <NotePencil size={15} aria-hidden="true" />
        </span>
      )}
    </span>
  )
}
