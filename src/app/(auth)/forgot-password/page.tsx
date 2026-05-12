'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
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
      setError('發送失敗，請確認信箱是否正確')
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
          <h1 className="text-2xl font-bold text-gray-900">重設密碼</h1>
          <p className="text-sm text-gray-500 mt-1">我們會寄送重設連結到你的信箱</p>
        </div>
        {sent ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center space-y-3">
            <div className="text-4xl">📬</div>
            <p className="font-semibold text-gray-900">已寄出重設信</p>
            <p className="text-sm text-gray-500">
              請查看 <span className="font-medium text-gray-700">{email}</span> 的收件匣，點擊信中連結即可設定新密碼
            </p>
          </div>
        ) : (
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 rounded-xl py-3 text-sm font-medium hover:brightness-95 transition-[filter] disabled:opacity-50"
            >
              {loading ? '寄送中...' : '寄送重設連結'}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-gray-800 font-medium underline">
            返回登入
          </Link>
        </p>
      </div>
    </div>
  )
}
