'use client'
import { useTransition } from 'react'
import { approveNote, unapproveNote } from '@/app/(app)/notes/[date]/actions'
import { useI18n } from '@/components/i18n/I18nProvider'
import { CheckCircle, Clock } from '@phosphor-icons/react'

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
    // 已審核/待審核的差別由圖示「形狀」承擔（打勾 vs 時鐘），底色與文字一律用主題色。
    // 先前用綠色表示已審核，在 forest/teal 這類綠色系主題下會與主色糊在一起，看不出是狀態。
    <div className="flex items-center justify-between rounded-2xl px-4 py-3 mb-4 bg-primary-light">
      <div className="flex items-center gap-2">
        {isApproved
          ? <CheckCircle size={18} weight="fill" className="text-primary-dark" />
          : <Clock size={18} weight="fill" className="text-primary-dark" />}
        <span className="text-sm font-medium text-primary-dark">
          {isApproved ? t('approval.approved') : t('approval.pending')}
        </span>
      </div>
      {isApproved ? (
        <button
          onClick={handleUnapprove}
          disabled={pending}
          className="text-xs text-gray-400 hover:text-danger active:opacity-50 transition-colors disabled:opacity-50"
        >
          {pending ? t('approval.processing') : t('approval.unapprove')}
        </button>
      ) : (
        <button
          onClick={handleApprove}
          disabled={pending}
          className="text-xs bg-primary-dark text-white px-3 py-1.5 rounded-full font-medium hover:bg-primary-dark active:scale-95 transition-colors disabled:opacity-50"
        >
          {pending ? t('approval.processing') : t('approval.approve')}
        </button>
      )}
    </div>
  )
}
