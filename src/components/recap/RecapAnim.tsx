'use client'
import { createContext, useContext } from 'react'

/**
 * 「這一頁該不該演進場動畫」。
 *
 * 第一次翻到一頁時，內容依序浮上來是儀式感；但翻回去看第二次，同一套動畫再演一遍
 * 就只是等待——統計頁四段跑完要一秒半，來回翻幾次會覺得整本書很慢。
 *
 * 做成 context 而不是 prop：頁面是在 RecapContent 就組好的 ReactNode，RecapBook
 * 拿到的是現成的節點，沒有地方可以插 prop 進去。
 */
const RecapAnimCtx = createContext(true)

export function useRecapAnim() {
  return useContext(RecapAnimCtx)
}

export function RecapAnimProvider({ animate, children }: { animate: boolean; children: React.ReactNode }) {
  return <RecapAnimCtx.Provider value={animate}>{children}</RecapAnimCtx.Provider>
}
