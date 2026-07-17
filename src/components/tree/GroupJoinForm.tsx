'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  canJoin: boolean
}

export default function GroupJoinForm({ canJoin }: Props) {
  const router = useRouter()
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!canJoin) {
    return (
      <div className="bg-gray-50 rounded-2xl p-4 text-center">
        <p className="text-sm text-gray-600 font-medium">{t('group.wantToJoin')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('group.maxGroupsReached', { max: 3 })}</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? t('group.joinFail'))
      } else {
        router.refresh()
      }
    } catch {
      setError(t('group.joinFail'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">{t('group.enterInviteCodeToJoin')}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder={t('group.inviteCodePlaceholder')}
          maxLength={8}
          className="flex-1 bg-surface border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary tracking-widest font-mono"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-4 py-2 rounded-xl btn-gradient text-gray-900 text-sm font-medium disabled:opacity-50 transition-opacity"
        >
          {loading ? '…' : t('group.join')}
        </button>
      </form>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
