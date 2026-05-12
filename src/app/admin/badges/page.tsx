'use client'
import { useState, useEffect } from 'react'
import type { Badge } from '@/types/app'

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/badges').then(r => r.json()).then(setBadges)
  }, [])

  async function save(badge: Badge) {
    setSaving(badge.id)
    setMsg('')
    const res = await fetch('/api/admin/badges', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badge),
    })
    setSaving(null)
    setMsg(res.ok ? '已儲存' : '儲存失敗')
    setTimeout(() => setMsg(''), 2000)
  }

  function update(id: string, field: keyof Badge, value: string | number | boolean) {
    setBadges(bs => bs.map(b => b.id === id ? { ...b, [field]: value } : b))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">徽章管理</h1>
        {msg && <span className="text-sm text-gray-700">{msg}</span>}
      </div>
      {badges.map(b => (
        <div key={b.id} className="bg-white rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{b.icon}</span>
            <input
              value={b.icon}
              onChange={e => update(b.id, 'icon', e.target.value)}
              className="w-16 border rounded px-2 py-1 text-sm text-center"
            />
            <div
              onClick={() => update(b.id, 'is_active', !b.is_active)}
              className={`w-10 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${b.is_active ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${b.is_active ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-xs text-gray-400">{b.is_active ? '啟用' : '停用'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">名稱</label>
              <input value={b.name_zh} onChange={e => update(b.id, 'name_zh', e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">解鎖數值</label>
              <input type="number" value={b.condition_value}
                onChange={e => update(b.id, 'condition_value', parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">說明</label>
              <input value={b.description_zh} onChange={e => update(b.id, 'description_zh', e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">獎勵積分</label>
              <input type="number" value={b.points_bonus}
                onChange={e => update(b.id, 'points_bonus', parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>
          </div>
          <button
            onClick={() => save(b)}
            disabled={saving === b.id}
            className="text-sm bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 px-4 py-1.5 rounded-lg hover:brightness-95 disabled:opacity-50 transition-colors"
          >
            {saving === b.id ? '儲存中...' : '儲存'}
          </button>
        </div>
      ))}
    </div>
  )
}
