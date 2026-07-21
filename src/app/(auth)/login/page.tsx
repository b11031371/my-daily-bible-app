'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Eye, EyeSlash } from '@phosphor-icons/react'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(t('auth.login.error'))
      setLoading(false)
    } else {
      router.push('/notes')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <img src="/icons/icon.svg" alt="Sproutiv" className="w-14 h-14 rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-heading">Sproutiv</h1>
          <p className="text-sm text-gray-500 mt-1">{t('auth.login.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl shadow-sm p-6 space-y-4">
          {error && (
            <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>
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
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">{t('auth.password')}</label>
              <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                aria-label={showPw ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gradient text-gray-900 rounded-xl py-3 text-sm font-medium hover:brightness-95 transition-[filter] disabled:opacity-50"
          >
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          {t('auth.login.noAccount')}{' '}
          <Link href="/register" className="text-gray-800 font-medium underline">
            {t('auth.login.registerNow')}
          </Link>
        </p>
      </div>
    </div>
  )
}
