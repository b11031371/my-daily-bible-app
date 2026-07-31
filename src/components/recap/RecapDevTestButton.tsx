'use client'
import { Bug } from '@phosphor-icons/react'
import { useRecap } from '@/components/recap/RecapProvider'
import { prevMonth, todayString } from '@/lib/utils'

/**
 * 開發模式專用：不必真的等到「這個月第一次簽到」就能看到回顧彈窗。
 *
 * 帶 month 呼叫 checkRecap 會命中 /api/recap/claim 的開發逃生門（見該檔案），
 * 跳過「已經認領過」的節流，每次點都會真的打一次、真的跳彈窗。正式環境
 * 這支 API 完全忽略 body，所以這顆按鈕本身也刻意不在正式環境掛載。
 */
export default function RecapDevTestButton() {
  const { checkRecap } = useRecap()
  if (process.env.NODE_ENV === 'production') return null

  return (
    <button
      type="button"
      onClick={() => checkRecap(0, prevMonth(todayString()))}
      title="測試回顧彈窗（上個月）"
      className="flex items-center justify-center text-gray-400 hover:text-gray-600 active:opacity-50"
    >
      <Bug size={20} />
    </button>
  )
}
