'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * 數字變大時從舊值跑到新值（例如簽到後的天數、積分）。第一次畫出來不跑，
 * 只有值在畫面上真的變了才跑；系統開了「減少動態效果」就直接換。
 */
export default function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    if (value < from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <>{shown}</>
}
