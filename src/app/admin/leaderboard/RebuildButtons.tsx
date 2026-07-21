'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPeriodLabel } from '@/lib/utils'
import { CheckCircle, XCircle } from '@phosphor-icons/react'

// 成敗狀態獨立成欄位，不再靠訊息開頭的 emoji 判斷。
type Result = { ok: boolean; text: string }

export default function RebuildButtons() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  async function rebuild(period_type: 'weekly' | 'monthly') {
    setLoading(true)
    setResult(null)
    const period_label = getPeriodLabel(period_type)
    const res = await fetch('/api/admin/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_type, period_label }),
    })
    if (res.ok) {
      setResult({ ok: true, text: `${period_type === 'weekly' ? '週榜' : '月榜'}已更新（${period_label}）` })
      router.refresh()
    } else {
      setResult({ ok: false, text: '更新失敗' })
    }
    setLoading(false)
  }

  return (
    <div className="bg-surface rounded-xl p-4 shadow-sm space-y-3">
      <p className="text-sm text-gray-500">手動重新計算當前週榜或月榜。每次有人簽到或回答後建議更新一次。</p>
      {result && (
        <p className={`text-sm flex items-center gap-1.5 ${result.ok ? 'text-gray-700' : 'text-danger'}`}>
          {result.ok ? <CheckCircle size={16} weight="fill" className="text-primary-dark" /> : <XCircle size={16} weight="fill" />}
          {result.text}
        </p>
      )}
      <button onClick={() => rebuild('monthly')} disabled={loading}
        className="w-full btn-gradient text-gray-900 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
        更新本月榜
      </button>
    </div>
  )
}
