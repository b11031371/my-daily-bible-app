'use client'
import { useCallback, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  SUMMARY_REFRESH_MIN,
  SUMMARY_REFRESH_MIN_QUOTA,
  SUMMARY_REFRESH_STEP,
} from '@/lib/recap-summary'

/** 卡片寬度。書在手機上大概 288–343px 寬，這個寬度壓在書裡不會凸出去 */
const CARD_W = 240
/** 卡片離問號的距離 */
const GAP = 6
/** 貼到視窗邊緣時留的餘裕 */
const EDGE = 8

/**
 * 重新整理次數的規則說明，一顆問號按鈕點開一張卡。
 *
 * 沿用社群那顆問號的樣式與「左標籤右數值」列表（CommunityInfoButton）。刻意
 * 複製而不是抽共用元件——整體視覺還沒到要統一的時候，先讓兩邊各自能改。
 *
 * 卡片一定要 portal 到 body：書頁外層是 overflow-hidden（RecapPage），書封板
 * 也是（RecapBook），絕對定位會被裁掉；而整本書都在 3D 變換的堆疊環境裡，
 * position: fixed 會改用變換過的祖先當包含塊，貼不到視窗上。
 *
 * 代價是位置要自己算：portal 出去之後沒有「問號正下方」這種相對定位可用，
 * 只能量問號的 rect 再換算成 fixed 座標。
 */
export default function RecapRefreshInfo() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // 掛在問號正下方、左緣對齊問號；貼到視窗右邊時往左收，不讓卡片被切掉。
  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const left = Math.min(Math.max(EDGE, r.left), window.innerWidth - CARD_W - EDGE)
    setPos({ top: r.bottom + GAP, left })
  }, [])

  useEffect(() => {
    if (!open) return
    place()

    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      // 卡片被 portal 出去了，不在 ref 的子樹裡，兩邊都要問過才算「點在外面」
      if (ref.current?.contains(target) || cardRef.current?.contains(target)) return
      setOpen(false)
    }

    // scroll 用捕獲階段：會捲動的是書頁內層那個容器，冒泡到 window 收不到
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  const rows = [
    // 門檻與次數都從常數帶進文案，改規則時不會有一邊忘了改
    { key: 'tier1', label: t('recap.summaryRuleTier1', { count: SUMMARY_REFRESH_MIN }), value: t('recap.summaryRuleTimes', { count: SUMMARY_REFRESH_MIN_QUOTA }) },
    { key: 'tier2', label: t('recap.summaryRuleTier2', { count: SUMMARY_REFRESH_STEP }), value: t('recap.summaryRuleTimes', { count: SUMMARY_REFRESH_STEP }) },
    { key: 'tier3', label: t('recap.summaryRuleTier3'), value: t('recap.summaryRulePlus', { count: 1 }) },
    { key: 'auto', label: t('recap.summaryRuleAuto'), value: t('recap.summaryRuleFree') },
    { key: 'keep', label: t('recap.summaryRuleKeep'), value: t('recap.summaryRuleKept') },
  ]

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={t('recap.summaryRulesTitle')}
        // 比社群那顆小一號：這裡的鄰居是 11px 的標題，20px 的圈圈會搶過去
        className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[9px] font-bold flex items-center justify-center hover:border-gray-400 hover:text-gray-500 active:opacity-50 transition-colors"
      >
        ?
      </button>

      {open && pos && createPortal(
        <div
          ref={cardRef}
          style={{ top: pos.top, left: pos.left, width: CARD_W }}
          // z-[110]：回顧有兩個入口，其中一個是 z-[100] 的彈窗（RecapModal），
          // 卡片 portal 到 body 之後就跟那層遮罩平起平坐，比它低就會整個被蓋掉。
          // 壓在 BadgeToast 的 z-[200] 底下——徽章通知比一張說明卡重要。
          className="fixed z-[110] rounded-xl border border-gray-100 bg-surface p-3 shadow-lg"
        >
          <p className="text-xs font-semibold text-heading mb-2">{t('recap.summaryRulesTitle')}</p>
          <div className="space-y-1.5">
            {rows.map(r => (
              <div key={r.key} className="flex items-start justify-between gap-3">
                <span className="text-[11px] leading-snug text-gray-500">{r.label}</span>
                <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-gray-800">{r.value}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
