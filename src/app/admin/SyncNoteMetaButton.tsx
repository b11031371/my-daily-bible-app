'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from '@phosphor-icons/react'

export default function SyncNoteMetaButton({ syncedCount }: { syncedCount: number }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  async function sync() {
    setRunning(true)
    setStatus(null)
    let total = 0
    // 每次請求只處理一批（20 天），所以在這裡迴圈到 remaining 歸零。
    // synced === 0 也要跳出：否則某天一直抓不到範圍時會無限打下去。
    for (;;) {
      const res = await fetch('/api/admin/note-meta', { method: 'POST' })
      if (!res.ok) {
        setStatus({ ok: false, text: '同步失敗' })
        break
      }
      const { synced, remaining } = await res.json()
      total += synced
      setStatus({ ok: true, text: `已同步 ${total} 天，剩 ${remaining} 天…` })
      if (remaining === 0 || synced === 0) {
        setStatus({ ok: true, text: total ? `完成，共同步 ${total} 天` : '已是最新，沒有要補的日期' })
        break
      }
    }
    setRunning(false)
    router.refresh()
  }

  return (
    <div className="bg-surface rounded-xl p-5 shadow-sm space-y-3">
      <div>
        <p className="font-medium text-gray-900">同步經文範圍</p>
        <p className="text-xs text-gray-400 mt-0.5">
          目前已收錄 {syncedCount} 天。上傳新筆記時會自動補，這裡是用來回填舊資料的。
        </p>
      </div>
      {status && (
        <p className={`text-sm flex items-center gap-1.5 ${status.ok ? 'text-gray-700' : 'text-danger'}`}>
          {status.ok
            ? <CheckCircle size={16} weight="fill" className="text-primary-dark" />
            : <XCircle size={16} weight="fill" />}
          {status.text}
        </p>
      )}
      <button
        onClick={sync}
        disabled={running}
        className="w-full btn-gradient text-gray-900 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {running ? '同步中…' : '開始同步'}
      </button>
    </div>
  )
}
