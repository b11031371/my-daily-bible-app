'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PROMPT_SWAP_LIMIT, type ReflectionPromptResponse } from '@/lib/reflection-prompt-shared'

interface PromptState {
  prompt: string | null
  remaining: number
  limit: number
  unlimited: boolean
}

const INITIAL: PromptState = { prompt: null, remaining: PROMPT_SWAP_LIMIT, limit: PROMPT_SWAP_LIMIT, unlimited: false }

/**
 * 心得框的 AI 建議（見 /api/reflection/prompt）。
 * enabled 為 false 時（提示關掉、已送出心得）不打 API，省一次呼叫。
 */
export function useReflectionPrompt(date: string, lang: 'zh' | 'en', enabled: boolean) {
  const [state, setState] = useState<PromptState>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  // 這次打開以來看過的建議，換一個時傳給後端，請模型別重複
  const seenRef = useRef<string[]>([])
  // 已經載入過哪份筆記哪個語言。關掉提示再打開時，同一份就直接沿用手上的句子，
  // 不再打 API（就算命中快取也要約半秒，會先閃一下載入狀態）
  const loadedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const key = `${date}:${lang}`
    if (loadedKeyRef.current === key) return
    let cancelled = false
    setLoading(true)
    setFailed(false)
    seenRef.current = []
    fetch(`/api/reflection/prompt?date=${date}&lang=${lang}`)
      .then(res => (res.ok ? (res.json() as Promise<ReflectionPromptResponse>) : null))
      .then(data => {
        if (cancelled || !data) return
        setState({ prompt: data.prompt, remaining: data.remaining, limit: data.limit, unlimited: !!data.unlimited })
        if (data.prompt) seenRef.current = [data.prompt]
        loadedKeyRef.current = key
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date, lang, enabled])

  const swap = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch('/api/reflection/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, lang, previous: seenRef.current }),
      })
      const data = (await res.json()) as ReflectionPromptResponse
      // 429（用完）/ 409（連點撞到）也帶著最新的剩餘次數回來
      setState(prev => ({
        prompt: data.prompt ?? prev.prompt,
        remaining: data.remaining ?? prev.remaining,
        limit: data.limit ?? prev.limit,
        unlimited: !!data.unlimited,
      }))
      if (data.prompt) seenRef.current = [...seenRef.current, data.prompt]
      else if (res.ok) setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [date, lang])

  return { ...state, loading, failed, swap }
}
