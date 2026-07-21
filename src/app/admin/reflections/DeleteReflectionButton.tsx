'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteReflectionButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/admin/reflections/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex gap-1 shrink-0">
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
