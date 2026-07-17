'use client'
import { useTransition } from 'react'
import { approveNote, unapproveNote } from '@/app/(app)/notes/[date]/actions'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  date: string
  isApproved: boolean
}

export default function ApprovalBanner({ date, isApproved }: Props) {
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()

  const handleApprove = () => startTransition(() => approveNote(date))
  const handleUnapprove = () => startTransition(() => unapproveNote(date))

  return (
    <div className={`flex items-center justify-between rounded-2xl px-4 py-3 mb-4 ${isApproved ? 'bg-green-50' : 'bg-primary-light'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{isApproved ? '✅' : '🟡'}</span>
        <span className={`text-sm font-medium ${isApproved ? 'text-green-700' : 'text-primary-dark'}`}>
          {isApproved ? t('approval.approved') : t('approval.pending')}
        </span>
      </div>
      {isApproved ? (
        <button
          onClick={handleUnapprove}
          disabled={pending}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {pending ? t('approval.processing') : t('approval.unapprove')}
        </button>
      ) : (
        <button
          onClick={handleApprove}
          disabled={pending}
          className="text-xs bg-primary-dark text-white px-3 py-1.5 rounded-full font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {pending ? t('approval.processing') : t('approval.approve')}
        </button>
      )}
    </div>
  )
}
