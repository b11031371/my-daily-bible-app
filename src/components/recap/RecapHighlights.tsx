'use client'
import type { CSSProperties, ReactNode } from 'react'
import { Sun, SunHorizon, CloudSun, MoonStars, Moon, Question } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { localize } from '@/lib/i18n'
import { localizeBibleBook } from '@/lib/bible-books'
import BadgeIcon from '@/components/profile/BadgeIcon'
import RecapPage from '@/components/recap/RecapPage'
import { COUNT_SLOT, withSlot } from '@/components/recap/CountSlot'
import type { MonthRecap, RhythmBucket } from '@/lib/recap'

const RHYTHM_ICON: Record<RhythmBucket, typeof Sun> = {
  dawn: SunHorizon,
  morning: Sun,
  afternoon: CloudSun,
  evening: MoonStars,
  night: Moon,
  none: Question,
}

// 稱號的 i18n key。分開列而不是字串拼接，翻譯檔才搜得到。
const RHYTHM_KEY: Record<RhythmBucket, string> = {
  dawn: 'recap.rhythmDawn',
  morning: 'recap.rhythmMorning',
  afternoon: 'recap.rhythmAfternoon',
  evening: 'recap.rhythmEvening',
  night: 'recap.rhythmNight',
  none: 'recap.rhythmNone',
}

/**
 * 作息那一段的背景暈色。刻意用固定色相而不是主題色——「早晨是暖的、深夜是冷的」
 * 是這段的內容本身，跟著主題換色就沒意義了。透明度壓低，只當紙上的一抹水彩。
 */
const RHYTHM_TINT: Record<RhythmBucket, string> = {
  dawn: 'radial-gradient(130% 90% at 50% 0%, rgb(251 146 60 / 0.20), transparent 70%)',
  morning: 'radial-gradient(130% 90% at 50% 0%, rgb(250 204 21 / 0.20), transparent 70%)',
  afternoon: 'radial-gradient(130% 90% at 50% 0%, rgb(56 189 248 / 0.18), transparent 70%)',
  evening: 'radial-gradient(130% 90% at 50% 0%, rgb(129 140 248 / 0.20), transparent 70%)',
  night: 'radial-gradient(130% 90% at 50% 0%, rgb(79 70 229 / 0.24), transparent 70%)',
  // 沒有時段可言，用中性的灰棕色，不假裝有一個時間規律
  none: 'radial-gradient(130% 90% at 50% 0%, rgb(148 130 110 / 0.16), transparent 70%)',
}

/**
 * 統計頁：作息、讀了多少、寫了多少、徽章，四段寫在同一頁。
 *
 * 沒有小標題，段落之間靠手繪線分隔——四個標題會讓一頁短內容看起來像表單。
 * 全部置中：每段的長短差很多（一個稱號 vs 一排徽章），靠左會讓右側參差不齊。
 * 段落依序浮現（見 .recap-reveal），一次讀一段。
 *
 * 頁高是固定的，所以這裡刻意保持精簡，讓整頁不必捲動就看得完。
 */
export function StatsPage({ recap, page }: { recap: MonthRecap; page: number }) {
  const { t, locale } = useI18n()
  const { rhythm, chapterCount, books, reflectionCount, badges } = recap
  const Icon = RHYTHM_ICON[rhythm.bucket]

  // 四段一律顯示，包括 0 章、0 則反思——這個月的樣子如實呈現，不因為沒東西就藏起來。
  const sections: ReactNode[] = [
    <div key="rhythm">
      <Icon size={36} weight="fill" className="text-heading mx-auto mb-1.5" />
      {/* text-balance：中文稱號都短，一行放得下；英文是完整句子，換行容易斷成
          「一大段＋孤字」，balance 讓斷行落在字數平均的地方 */}
      <p className="text-xl font-bold text-gray-900 leading-snug text-balance">{t(RHYTHM_KEY[rhythm.bucket])}</p>
      {rhythm.bucket !== 'none' && (
        <p className="text-sm text-gray-600 mt-0.5">
          {t('recap.rhythmWhen', { from: rhythm.hourFrom, to: rhythm.hourTo })}
        </p>
      )}
    </div>,
    <div key="chapters">
      <p className="text-base text-gray-800">
        {withSlot(
          t('recap.chaptersSentence', { count: COUNT_SLOT }),
          <BigNumber>{chapterCount}</BigNumber>
        )}
      </p>
      {chapterCount > 0 && (
        <>
          <p className="text-sm text-gray-600 mt-0.5">{t('recap.acrossBooks', { count: books.length })}</p>
          {/* 書卷名單就放在計數旁邊：「跨越 3 卷書」加上是哪三卷才是完整的一句話 */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1.5">
            {books.map(b => (
              <span key={b.book} className="text-sm text-gray-800 border-b border-primary-dark/30">
                {localizeBibleBook(b.book, locale)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>,
    <div key="reflections">
      <p className="text-base text-gray-800">
        {withSlot(
          t('recap.reflectionCount', { count: COUNT_SLOT }),
          <BigNumber>{reflectionCount}</BigNumber>
        )}
      </p>
    </div>,
    <div key="badges">
      <p className="text-[11px] tracking-wider text-gray-500 mb-2">{t('recap.sectionBadges')}</p>
      {badges.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {badges.map(b => (
            <span key={b.id} className="inline-flex items-center gap-1.5">
              <BadgeIcon badgeId={b.id} size={24} className="shrink-0" />
              <span className="text-sm text-gray-800">{localize(b.nameI18n, locale, b.nameZh)}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('recap.noBadges')}</p>
      )}
    </div>,
  ]

  return (
    <RecapPage page={page} center stagger={false} tint={RHYTHM_TINT[rhythm.bucket]}>
      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i}>
            {i > 0 && <HandDrawnRule delay={i} />}
            <div className="recap-reveal" style={{ '--n': i } as CSSProperties}>{s}</div>
          </div>
        ))}
      </div>
    </RecapPage>
  )
}

// 句子裡的大數字。章數和反思共用同一個尺寸，兩段才讀得出是同一種東西。
//
// 改用封面那組襯線字（Garamond + Noto Serif TC），不用文楷的 font-black：
// 文楷只載入 300/400/700，900 是瀏覽器把 700 再加粗合成出來的，在 5xl 尺寸下
// 筆畫會糊、字腔塞住。這裡吃的是真正載入的 600 字重，同時讓封面與內頁的大數字
// 第一次共用同一支字。
function BigNumber({ children }: { children: ReactNode }) {
  return (
    <span className="recap-figure text-5xl font-black text-heading mx-1.5 align-baseline tabular-nums">
      {children}
    </span>
  )
}

// 手畫的分隔線：略帶起伏的一筆，比 border-t 的直線更像寫在本子上。
// 跟著它下面那一段一起浮現，不然線會先出現、內容才跟上。
function HandDrawnRule({ delay }: { delay: number }) {
  return (
    <svg
      viewBox="0 0 200 6"
      className="recap-reveal w-1/2 h-1.5 mx-auto mb-4 text-primary-dark/25"
      style={{ '--n': delay } as CSSProperties}
      aria-hidden="true"
    >
      <path
        d="M2 4 Q40 1.5 78 3.4 T152 2.6 T198 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
