'use client'
import { useState } from 'react'
import { getPeriodLabel } from '@/lib/utils'

export default function AdminLeaderboardPage() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function rebuild(period_type: 'weekly' | 'monthly') {
    setLoading(true)
    setMsg('')
    const period_label = getPeriodLabel(period_type)
    const res = await fetch('/api/admin/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_type, period_label }),
    })
    setMsg(res.ok ? `✅ ${period_type === 'weekly' ? '週榜' : '月榜'}已更新（${period_label}）` : '❌ 更新失敗')
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">排行榜管理</h1>
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        <p className="text-sm text-gray-500">手動重新計算當前週榜或月榜。每次有人簽到或回答後建議更新一次。</p>
        {msg && <p className={`text-sm ${msg.startsWith('✅') ? 'text-gray-700' : 'text-red-500'}`}>{msg}</p>}
        <div className="flex gap-3">
          <button onClick={() => rebuild('weekly')} disabled={loading}
            className="flex-1 bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
            更新本週榜
          </button>
          <button onClick={() => rebuild('monthly')} disabled={loading}
            className="flex-1 bg-[#c8a84b] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
            更新本月榜
          </button>
        </div>
      </div>
    </div>
  )
}
