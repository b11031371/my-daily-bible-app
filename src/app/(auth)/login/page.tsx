'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeSlash } from '@phosphor-icons/react'

export default function LoginPage() {
  const router = useRouter()
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
      setError('帳號或密碼錯誤，請再試一次')
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
          <h1 className="text-2xl font-bold text-gray-900">Sproutiv</h1>
          <p className="text-sm text-gray-500 mt-1">登入你的帳號</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
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
              <label className="text-sm font-medium text-gray-700">密碼</label>
              <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                忘記密碼？
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
                aria-label={showPw ? '隱藏密碼' : '顯示密碼'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 rounded-xl py-3 text-sm font-medium hover:brightness-95 transition-[filter] disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          還沒有帳號？{' '}
          <Link href="/register" className="text-gray-800 font-medium underline">
            立即註冊
          </Link>
        </p>
      </div>
    </div>
  )
}
