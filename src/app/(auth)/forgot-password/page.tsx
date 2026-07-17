'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    if (error) {
      setError(t('auth.forgot.error'))
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <img src="/icons/icon.svg" alt="Sproutiv" className="w-14 h-14 rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-heading">{t('auth.forgot.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('auth.forgot.subtitle')}</p>
        </div>
        {sent ? (
          <div className="bg-surface rounded-2xl shadow-sm p-6 text-center space-y-3">
            <div className="text-4xl">📬</div>
            <p className="font-semibold text-gray-900">{t('auth.forgot.sentTitle')}</p>
            <p className="text-sm text-gray-500">{t('auth.forgot.sentBody', { email })}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface rounded-2xl shadow-sm p-6 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="your@email.com"
                autoComplete="email"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gradient text-gray-900 rounded-xl py-3 text-sm font-medium hover:brightness-95 transition-[filter] disabled:opacity-50"
            >
              {loading ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-gray-800 font-medium underline">
            {t('auth.forgot.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}
