'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Eye, EyeSlash } from '@phosphor-icons/react'

function calcStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 6) return 0
  let score = 1
  if (pw.length >= 8) score++
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++
  return score as 0 | 1 | 2 | 3
}
const STRENGTH_COLOR = ['', 'bg-red-400', 'bg-amber-400', 'bg-green-500']
const STRENGTH_KEY   = ['', 'auth.strengthWeak', 'auth.strengthOk', 'auth.strengthStrong']
const STRENGTH_TEXT  = ['', 'text-red-500', 'text-amber-500', 'text-green-600']

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = calcStrength(password)
  const confirmMismatch = confirm.length > 0 && confirm !== password

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError(t('auth.pwTooShort')); return }
    if (password !== confirm) { setError(t('auth.pwMismatchSubmit')); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: undefined,
      },
    })
    if (error) {
      setError(error.message === 'User already registered' ? t('auth.register.emailTaken') : t('auth.register.error'))
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
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.register.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('auth.register.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.nickname')}</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('auth.register.nicknamePlaceholder')}
              autoComplete="nickname"
              required
            />
          </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('auth.register.pwPlaceholder')}
                autoComplete="new-password"
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
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? STRENGTH_COLOR[strength] : 'bg-gray-100'}`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${STRENGTH_TEXT[strength]}`}>
                  {strength > 0 ? t(STRENGTH_KEY[strength]) : ''}
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.confirmPassword')}</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 transition-colors ${
                  confirmMismatch
                    ? 'border-red-300 focus:ring-red-300'
                    : 'border-gray-200 focus:ring-primary'
                }`}
                placeholder={t('auth.register.confirmPlaceholder')}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmMismatch && (
              <p className="mt-1 text-xs text-red-500">{t('auth.register.mismatch')}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || confirmMismatch}
            className="w-full bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 rounded-xl py-3 text-sm font-medium hover:brightness-95 transition-[filter] disabled:opacity-50"
          >
            {loading ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          {t('auth.register.haveAccount')}{' '}
          <Link href="/login" className="text-gray-800 font-medium underline">
            {t('auth.register.loginNow')}
          </Link>
        </p>
      </div>
    </div>
  )
}
