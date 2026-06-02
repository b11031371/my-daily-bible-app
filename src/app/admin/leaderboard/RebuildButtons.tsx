'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPeriodLabel } from '@/lib/utils'

export default function RebuildButtons() {
  const router = useRouter()
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
    if (res.ok) {
      setMsg(`✅ ${period_type === 'weekly' ? '週榜' : '月榜'}已更新（${period_label}）`)
      router.refresh()
    } else {
      setMsg('❌ 更新失敗')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
      <p className="text-sm text-gray-500">手動重新計算當前週榜或月榜。每次有人簽到或回答後建議更新一次。</p>
      {msg && <p className={`text-sm ${msg.startsWith('✅') ? 'text-gray-700' : 'text-red-500'}`}>{msg}</p>}
      <button onClick={() => rebuild('monthly')} disabled={loading}
        className="w-full bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
        更新本月榜
      </button>
    </div>
  )
}
