'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { formatMonth, todayString } from '@/lib/utils'
import RecapContent from '@/components/recap/RecapContent'
import type { MonthRecap } from '@/lib/recap'

/**
 * 月初第一次簽到後跳出的回顧彈窗。
 *
 * 分兩個階段：先只有一句話說明「你剛完成本月第一次簽到，所以上個月的回顧來了」，
 * 使用者點一下書才升起。使用者剛按下簽到、畫面突然被一本書蓋住，如果不先交代
 * 因果，第一反應會是「這什麼？我按錯了嗎？」——標題列寫再清楚都不如順著時間軸
 * 講一次。
 *
 * 由使用者點掉而不是自動跳走：讀字的速度差很多，計時器對讀得慢的人是打斷，
 * 對讀得快的人是等待；而且「我按了它才動」本身就把接下來要翻頁這件事鋪好了。
 */
export default function RecapModal({ recap, onClose }: { recap: MonthRecap; onClose: () => void }) {
  const { t, locale } = useI18n()
  const [showBook, setShowBook] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // 鎖住背景捲動。不鎖的話 iOS Safari 會在手指滑動翻頁時連背景一起捲，
    // 遮罩跟著漂移，看起來像整頁在晃。
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // 書出現後才把焦點交給關閉鈕：前言階段就搶焦點會唸出「關閉」，蓋掉那句說明。
  useEffect(() => {
    if (showBook) closeRef.current?.focus()
  }, [showBook])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('recap.modalTitle')}
      className="recap-scrim fixed inset-0 z-[100] bg-black/85 flex items-center justify-center px-5 py-6"
    >
      {!showBook ? (
        // 整塊都可以點，不必瞄準某顆按鈕
        <button
          type="button"
          onClick={() => setShowBook(true)}
          className="recap-intro text-center px-6"
        >
          <p className="text-base text-white/90 leading-relaxed">
            {t('recap.introFirstCheckin', { month: formatMonth(todayString(), locale) })}
          </p>
          <p className="text-sm text-white/60 mt-2">
            {t('recap.introRecapReady', { month: formatMonth(recap.month, locale) })}
          </p>
          {/* 要點才會動，所以一定要說。呼吸般的明暗讓它自己被看見。 */}
          <p className="recap-breathe text-xs text-white/45 mt-8">{t('recap.introTap')}</p>
        </button>
      ) : (
        <div className="recap-enter w-full max-w-80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-white/70">{t('recap.modalTitle')}</p>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label={t('recap.close')}
              className="w-8 h-8 -mr-2 rounded-full flex items-center justify-center text-white/70 hover:text-white active:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <RecapContent recap={recap} />

          {/* 指到個人頁的月曆選單，而不是直接開這個月——使用者下次想回顧
              任何一個月，得先知道入口在哪裡。帶 recapTip 讓個人頁順便
              圈出那顆圖示，不然這句話等於白說。 */}
          <Link
            href="/profile?recapTip=1"
            onClick={onClose}
            className="block text-center text-xs text-white/60 hover:text-white/90 mt-3"
          >
            {t('recap.viewFull')} ›
          </Link>
        </div>
      )}
    </div>
  )
}
