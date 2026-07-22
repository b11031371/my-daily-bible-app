'use client'
import { useCallback, useRef } from 'react'
import useSWR from 'swr'
import type { QuizRoomState } from '@/types/app'

export interface PlayerIdentity {
  playerId: string
  token: string
}

/**
 * 房間狀態的唯一來源。沒有走 Supabase Realtime——現場就幾個人，SWR 輪詢
 * 足夠而且少一整層 RLS/連線授權的坑。答題中拉快一點、其他階段慢一點。
 *
 * 主持人按下控制鈕後自己呼叫 mutate()，畫面不必等下一次輪詢。
 * 之後若要降延遲，把 Realtime 的 postgres_changes 接上來觸發 mutate() 就好，
 * 這個 hook 對外的介面不用動。
 */
export function useRoomState(pin: string, identity: PlayerIdentity | null) {
  // 手機系統時間不準時倒數會整個歪掉，所以一律以伺服器時間為準。
  // 每次拿到回應就更新一次偏移量。
  const clockOffset = useRef(0)

  const query = identity
    ? `?playerId=${encodeURIComponent(identity.playerId)}&token=${encodeURIComponent(identity.token)}`
    : ''

  const { data, error, isLoading, mutate } = useSWR<QuizRoomState>(
    `/api/play/${pin}/state${query}`,
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw Object.assign(new Error(body.error ?? 'failed'), { code: body.code, status: res.status })
      }
      const state = (await res.json()) as QuizRoomState
      clockOffset.current = Date.parse(state.server_now) - Date.now()
      return state
    },
    {
      refreshInterval: latest =>
        latest?.room.status === 'question' ? 800
        : latest?.room.status === 'ended' ? 0
        : 2000,
      revalidateOnFocus: true,
      keepPreviousData: true,
      dedupingInterval: 300,
    }
  )

  /** 校正過的「現在」，用來算倒數 */
  const serverNow = useCallback(() => Date.now() + clockOffset.current, [])

  return { state: data, error, loading: isLoading && !data, mutate, serverNow }
}
