'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteReflectionButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleDelete() {
    setLoading(true)
    setFailed(false)
    const res = await fetch(`/api/admin/reflections/${id}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) {
      // 原本無論成敗都直接 refresh，刪不掉時該列還在，看起來像沒按到。
      setFailed(true)
      return
    }
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {failed && <span className="text-xs text-danger">刪除失敗</span>}
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-danger border border-danger-line rounded-lg px-2 py-1 hover:bg-danger-soft transition-colors disabled:opacity-50"
        >
          {loading ? '...' : '確認'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-400 px-2 py-1 hover:text-gray-600"
        >
          取消
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-gray-300 hover:text-danger transition-colors shrink-0 px-1 py-1"
    >
      刪除
    </button>
  )
}
