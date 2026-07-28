'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function JoinGroupModal() {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setOpen(false)
    router.refresh()
    router.push(`/community/groups/${data.id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium border border-gray-300 text-gray-700 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors shrink-0"
      >
        {t('group.join')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-surface w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">{t('group.joinGroupTitle')}</h2>
            <div>
              <label className="text-sm text-gray-600 block mb-1.5">{t('group.enterInviteCode')}</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder={t('group.inviteCodeExample')}
                maxLength={6}
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary uppercase"
              />
            </div>
            {error && <p className="text-sm text-danger text-center">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setCode(''); setError(null) }}
                className="flex-1 text-sm text-gray-500 bg-gray-50 rounded-xl py-3"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || code.length < 6}
                className="flex-1 text-sm font-semibold btn-gradient text-gray-900 rounded-xl py-3 hover:brightness-95 transition-[filter] disabled:opacity-50"
              >
                {loading ? t('group.joining') : t('group.join')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
