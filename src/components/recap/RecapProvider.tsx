'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import RecapModal from '@/components/recap/RecapModal'
import type { MonthRecap } from '@/lib/recap'

interface Ctx {
  /**
   * 簽到成功後呼叫。該不該跳彈窗由伺服器判斷，這裡不做任何條件。
   * delayMs：同時解鎖徽章時往後挪，讓徽章通知先亮完再蓋彈窗。
   * month：只有開發模式的測試按鈕會傳（見 RecapDevTestButton）——正式環境
   * API 完全忽略 body，這裡傳了也沒用，不會被濫用來亂喚彈窗。
   */
  checkRecap: (delayMs?: number, month?: string) => void
}

// 徽章通知（BadgeToast）是 z-[200]、彈窗是 z-[100]，同時出現時通知會壓在彈窗
// 標題列上。等它先站穩再跳，畫面才不會擠成一團。
export const BADGE_TOAST_GAP = 1200

const RecapCtx = createContext<Ctx>({ checkRecap: () => {} })

export function useRecap() {
  return useContext(RecapCtx)
}

/**
 * 每月回顧的全域掛載點。
 *
 * 做成 Provider 而不是塞進簽到頁，是因為簽到有兩個入口（簽到頁、筆記頁的快速
 * 簽到鈕），之後多加也不必再接一次。
 */
export function RecapProvider({ children }: { children: React.ReactNode }) {
  const [recap, setRecap] = useState<MonthRecap | null>(null)
  // 同一次瀏覽最多問一次伺服器。簽到頁上今日鈕和三顆補簽鈕都會呼叫，
  // 連按時不該打出好幾個請求（伺服器端有唯一鍵擋住重複彈窗，這裡只是省往返）。
  const asked = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(null)

  const checkRecap = useCallback((delayMs = 0, month?: string) => {
    // 帶 month 的是測試按鈕手動觸發，每次都要真的打——跟真實簽到流程的
    // 節流（asked ref）是兩件事，不能共用同一個旗標，不然點第二次就沒反應。
    if (!month) {
      if (asked.current) return
      asked.current = true
    }

    // 認領照樣立刻送出，延遲的只有「把彈窗畫出來」這件事——網路慢的時候，
    // 請求和徽章通知就能並行，不會延遲累加。
    const pending = (async () => {
      try {
        const res = await fetch('/api/recap/claim', {
          method: 'POST',
          ...(month && {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month }),
          }),
        })
        if (!res.ok) return null
        const data = await res.json()
        return (data.recap as MonthRecap | null) ?? null
      } catch {
        // 回顧是加分項，失敗就當沒這回事，不要打斷簽到成功的體驗。
        // 使用者仍可從個人頁的 /recap/[month] 看到。
        return null
      }
    })()

    void pending.then(result => {
      if (!result) return
      if (delayMs <= 0) return setRecap(result)
      timer.current = setTimeout(() => setRecap(result), delayMs)
    })
  }, [])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <RecapCtx.Provider value={{ checkRecap }}>
      {children}
      {recap && <RecapModal recap={recap} onClose={() => setRecap(null)} />}
    </RecapCtx.Provider>
  )
}
