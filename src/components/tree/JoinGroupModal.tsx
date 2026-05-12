'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinGroupModal() {
  const router = useRouter()
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
    router.push(`/community/groups/${data.id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
      >
        加入
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">加入群組</h2>
            <div>
              <label className="text-sm text-gray-600 block mb-1.5">輸入邀請碼</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="例：AB12CD"
                maxLength={6}
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              />
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setCode(''); setError(null) }}
                className="flex-1 text-sm text-gray-500 bg-gray-50 rounded-xl py-3"
              >
                取消
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || code.length < 6}
                className="flex-1 text-sm font-semibold bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 rounded-xl py-3 hover:brightness-95 transition-[filter] disabled:opacity-50"
              >
                {loading ? '加入中...' : '加入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
