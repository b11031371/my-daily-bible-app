'use client'
import { useState } from 'react'
import TitleDivider from '@/components/layout/TitleDivider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function NewGroupPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    router.refresh()
    router.push(`/community/groups/${data.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/community" className="text-gray-400 hover:text-gray-600 active:opacity-50 text-lg">‹</Link>
        <h1 className="page-title font-bold text-heading">{t('group.createTitle')}</h1>
      </div>
      <TitleDivider />

      <div className="bg-surface rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">{t('group.nameLabel')}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('group.namePlaceholder')}
            maxLength={20}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full btn-gradient text-gray-900 font-semibold rounded-xl py-3.5 hover:brightness-95 transition-[filter] disabled:opacity-50"
        >
          {loading ? t('group.creating') : t('group.create')}
        </button>

        <p className="text-xs text-gray-400 text-center">{t('group.createHint')}</p>
      </div>
    </div>
  )
}
