'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  canJoin: boolean
}

export default function GroupJoinForm({ canJoin }: Props) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!canJoin) {
    return (
      <div className="bg-gray-50 rounded-2xl p-4 text-center">
        <p className="text-sm text-gray-600 font-medium">想加入這個群組？</p>
        <p className="text-xs text-gray-400 mt-1">你已加入最多群組數量（{3} 個）</p>
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
        setError(data.error ?? '加入失敗，請再試一次')
      } else {
        router.refresh()
      }
    } catch {
      setError('加入失敗，請再試一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">輸入邀請碼加入此群組</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="邀請碼"
          maxLength={8}
          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary tracking-widest font-mono"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 text-sm font-medium disabled:opacity-50 transition-opacity"
        >
          {loading ? '…' : '加入'}
        </button>
      </form>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
