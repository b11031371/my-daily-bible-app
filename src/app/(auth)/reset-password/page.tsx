'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeSlash } from '@phosphor-icons/react'

function calcStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 6) return 0
  let score = 1
  if (pw.length >= 8) score++
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++
  return score as 0 | 1 | 2 | 3
}
const STRENGTH_COLOR = ['', 'bg-red-400', 'bg-amber-400', 'bg-green-500']
const STRENGTH_LABEL = ['', '弱', '普通', '強']
const STRENGTH_TEXT  = ['', 'text-red-500', 'text-amber-500', 'text-green-600']

export default function ResetPasswordPage() {
  const router = useRouter()
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
    if (password.length < 6) { setError('密碼至少需要 6 個字元'); return }
    if (password !== confirm) { setError('兩次輸入的密碼不一致'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('重設失敗，請重新嘗試或重寄重設信')
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
          <h1 className="text-2xl font-bold text-gray-900">設定新密碼</h1>
          <p className="text-sm text-gray-500 mt-1">請輸入你的新密碼</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="至少 6 個字元"
                autoComplete="new-password"
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
                  {STRENGTH_LABEL[strength]}
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
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
                placeholder="再輸入一次密碼"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? '隱藏密碼' : '顯示密碼'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmMismatch && (
              <p className="mt-1 text-xs text-red-500">密碼不一致</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || confirmMismatch}
            className="w-full bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 rounded-xl py-3 text-sm font-medium hover:brightness-95 transition-[filter] disabled:opacity-50"
          >
            {loading ? '更新中...' : '確認更新密碼'}
          </button>
        </form>
      </div>
    </div>
  )
}
