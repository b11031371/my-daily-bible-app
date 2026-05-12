'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewGroupPage() {
  const router = useRouter()
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
    router.push(`/community/groups/${data.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/community" className="text-gray-400 hover:text-gray-600 text-lg">‹</Link>
        <h1 className="text-xl font-bold text-gray-900">建立新群組</h1>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">幫你們的樹取個名字</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="我們的樹"
            maxLength={20}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 font-semibold rounded-xl py-3.5 hover:brightness-95 transition-[filter] disabled:opacity-50"
        >
          {loading ? '建立中...' : '建立群組'}
        </button>

        <p className="text-xs text-gray-400 text-center">建立後會取得邀請碼，邀請朋友一起種樹</p>
      </div>
    </div>
  )
}
