'use client'
import { useState, useEffect } from 'react'
import type { Profile } from '@/types/app'
import { createClient } from '@/lib/supabase/client'

export default function AdminCheckinsPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [userId, setUserId] = useState('')
  const [date, setDate] = useState('')
  const [points, setPoints] = useState(10)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').order('display_name').then(({ data }) => setUsers(data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    const res = await fetch('/api/admin/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, note_date: date, points }),
    })
    const data = await res.json()
    setMsg(res.ok ? `✅ 補簽成功` : `❌ ${data.error}`)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">補簽管理</h1>
      <div className="bg-surface rounded-xl p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">選擇使用者</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">請選擇...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">補簽日期</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">給予積分</label>
            <input type="number" value={points} onChange={e => setPoints(parseInt(e.target.value))}
              min={0} max={100} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          {msg && <p className={`text-sm ${msg.startsWith('✅') ? 'text-gray-700' : 'text-red-500'}`}>{msg}</p>}
          <button type="submit" disabled={loading}
            className="w-full btn-gradient text-gray-900 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
            {loading ? '處理中...' : '執行補簽'}
          </button>
        </form>
      </div>
    </div>
  )
}
