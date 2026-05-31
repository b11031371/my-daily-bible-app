'use client'
import { useTransition } from 'react'
import { approveNote, unapproveNote } from '@/app/(app)/notes/[date]/actions'

interface Props {
  date: string
  isApproved: boolean
}

export default function ApprovalBanner({ date, isApproved }: Props) {
  const [pending, startTransition] = useTransition()

  const handleApprove = () => startTransition(() => approveNote(date))
  const handleUnapprove = () => startTransition(() => unapproveNote(date))

  return (
    <div className={`flex items-center justify-between rounded-2xl px-4 py-3 mb-4 ${isApproved ? 'bg-green-50' : 'bg-amber-50'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{isApproved ? '✅' : '🟡'}</span>
        <span className={`text-sm font-medium ${isApproved ? 'text-green-700' : 'text-amber-700'}`}>
          {isApproved ? '已公開' : '待審核 · 此筆記尚未對外公開'}
        </span>
      </div>
      {isApproved ? (
        <button
          onClick={handleUnapprove}
          disabled={pending}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {pending ? '處理中…' : '取消審核'}
        </button>
      ) : (
        <button
          onClick={handleApprove}
          disabled={pending}
          className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-full font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {pending ? '處理中…' : '審核通過'}
        </button>
      )}
    </div>
  )
}
