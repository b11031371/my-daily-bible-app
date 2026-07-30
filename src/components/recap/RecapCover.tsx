'use client'
import { useId, type ReactNode } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { formatMonth } from '@/lib/utils'

/**
 * 封面與封底：深色皮革 + 金線框 + 金屬件。
 *
 * 顏色全部寫死、不吃主題也不吃深色模式的灰階反轉：封面是「一本舊本子」的實體，
 * 它不該跟著介面配色變。主題色留給內頁。
 *
 * 光源固定在左上，所有金屬件的高光、書脊凸帶的受光面都對齊同一個方向，
 * 元素之間才會像在同一個空間裡。
 */

const GOLD = '#e8c877'
const GOLD_DIM = 'rgb(232 200 119 / 0.78)'
const GOLD_LINE = 'rgb(232 200 119 / 0.9)'
const GOLD_HAIR = 'rgb(232 200 119 / 0.42)'

/**
 * 黃銅的色階。封面上所有金屬件——樹、包角、鎖片、鉚釘——共用同一組，
 * 換一組就會讀成兩種材質貼在一起。
 *
 * 亮→暗→亮的結構要保留：中間那道暗帶是「這是金屬」的證據。整條拉亮會變成
 * 一片均勻的黃色塑膠，反而更假。所以提亮是把每一階往上推，不是把暗帶拿掉。
 */
const BRASS = {
  hi: '#fffbe9',     // 稜線最亮處
  light: '#f6e0a2',
  mid: '#dcb35e',
  dark: '#b08528',   // 暗帶：金屬的轉折面
  glint: '#f0d48e',  // 暗帶之後的二次反光
  base: '#cea24a',
  // 折邊翻過去的那面，比暗帶再深一階
  foldHi: '#fffdf0',
  foldMid: '#eccb7a',
  foldDark: '#9c7622',
  foldDeep: '#76591a',
  // 鉚釘：釘身與釘頭受光
  rivet: '#9c7a26',
  rivetHi: '#fffbe9',
}

/** 樹的筆畫。描邊與填色分開設，兩份（暗底 + 金面）共用同一組路徑。 */
const TREE_PATHS = (
  <>
    <line x1="256" y1="400" x2="256" y2="272" strokeWidth="30" />
    <path d="M256 400 Q218 418 194 434" strokeWidth="18" fill="none" />
    <path d="M256 400 Q294 418 318 434" strokeWidth="18" fill="none" />
    <path d="M256 320 Q200 292 154 286" strokeWidth="20" fill="none" />
    <path d="M256 288 Q192 250 144 234" strokeWidth="18" fill="none" />
    <path d="M256 320 Q312 292 358 286" strokeWidth="20" fill="none" />
    <path d="M256 288 Q320 250 368 234" strokeWidth="18" fill="none" />
    <line x1="256" y1="288" x2="256" y2="136" strokeWidth="18" />
    <circle cx="144" cy="280" r="34" stroke="none" />
    <circle cx="138" cy="228" r="30" stroke="none" />
    <circle cx="368" cy="280" r="34" stroke="none" />
    <circle cx="374" cy="228" r="30" stroke="none" />
    <circle cx="256" cy="118" r="40" stroke="none" />
    <circle cx="210" cy="146" r="28" stroke="none" />
    <circle cx="302" cy="146" r="28" stroke="none" />
    <circle cx="200" cy="198" r="22" stroke="none" />
    <circle cx="312" cy="198" r="22" stroke="none" />
  </>
)

/**
 * App icon 的樹，做成金屬徽記。
 *
 * 用的是跟包角、鎖片同一組黃銅漸層——這張封面上所有金屬件都該是同一種合金，
 * 換一組色階就會讀成兩種材質貼在一起。
 *
 * 底下先鋪一份往下偏移的暗色，那是筆畫壓進皮革後的凹影。少了它，金色會像浮貼
 * 在表面的貼紙；有了它才像壓上去再鍍金的。
 *
 * 漸層 id 用 useId 產生：封面和封底各有一棵樹，寫死 id 會讓後掛載的那份去吃到
 * 前一份的定義。
 */
function TreeMark({ size, opacity = 1 }: { size: number; opacity?: number }) {
  const gid = `${useId()}-tree`

  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" opacity={opacity} aria-hidden="true">
      <defs>
        {/* userSpaceOnUse 而不是預設的 objectBoundingBox：樹幹和中央主枝是完全垂直的
            line，bbox 寬度為 0，比例座標的漸層在上面會退化成畫不出來。座標直接寫在
            viewBox 空間，跟個別筆畫的 bbox 無關，整棵樹才會是同一片金屬。 */}
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="77" y1="0" x2="410" y2="512">
          <stop offset="0" stopColor={BRASS.hi} />
          <stop offset="0.24" stopColor={BRASS.light} />
          <stop offset="0.5" stopColor={BRASS.mid} />
          <stop offset="0.68" stopColor={BRASS.dark} />
          <stop offset="0.86" stopColor={BRASS.glint} />
          <stop offset="1" stopColor={BRASS.base} />
        </linearGradient>
      </defs>

      <g transform="translate(0 7)" stroke="rgb(20 10 4 / 0.55)" fill="rgb(20 10 4 / 0.55)" strokeLinecap="round">
        {TREE_PATHS}
      </g>
      <g stroke={`url(#${gid})`} fill={`url(#${gid})`} strokeLinecap="round">
        {TREE_PATHS}
      </g>
    </svg>
  )
}

/** 徽記的圈：外圈實線、內圈虛線、刻度、四方菱點，下方一對葉子把圓收住。 */
function Roundel({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" style={{ overflow: 'visible' }} aria-hidden="true">
      <g fill="none" stroke={GOLD}>
        <circle cx="80" cy="80" r="64" strokeWidth="1" opacity="0.42" />
        <circle cx="80" cy="80" r="57" strokeWidth="0.7" opacity="0.85" strokeDasharray="1 5" strokeLinecap="round" />
        <circle cx="80" cy="80" r="46" strokeWidth="0.6" opacity="0.3" />
      </g>
      <g stroke={GOLD} strokeWidth="1.1" opacity="0.6" strokeLinecap="round">
        <path d="M80 10 v7 M80 143 v7 M10 80 h7 M143 80 h7" />
        <path d="M129.5 30.5 l-4.5 4.5 M35 125 l-4.5 4.5 M129.5 129.5 l-4.5 -4.5 M35 35 l-4.5 -4.5" opacity="0.4" />
      </g>
      <g fill={GOLD}>
        <rect x="76.5" y="0.5" width="7" height="7" transform="rotate(45 80 4)" />
        <rect x="76.5" y="152.5" width="7" height="7" transform="rotate(45 80 156)" />
        <rect x="0.5" y="76.5" width="7" height="7" transform="rotate(45 4 80)" />
        <rect x="152.5" y="76.5" width="7" height="7" transform="rotate(45 156 80)" />
      </g>
      <g fill="none" stroke={GOLD} strokeWidth="1.3" strokeLinecap="round" opacity="0.7">
        <path d="M62 132 Q72 142 80 143" />
        <path d="M98 132 Q88 142 80 143" />
        <path d="M66 128 Q70 133 76 134" opacity="0.6" />
        <path d="M94 128 Q90 133 84 134" opacity="0.6" />
      </g>
    </svg>
  )
}

/** 框角的捲草飾。三道粗細不同的弧線收在角落，中心一顆菱。 */
function Flourish({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 26 26" className={`absolute w-6 h-6 z-20 ${className}`} aria-hidden="true">
      <g fill="none" stroke={GOLD} strokeLinecap="round">
        <path d="M1 12 Q1 1 12 1" strokeWidth="1.2" opacity="0.9" />
        <path d="M5 16 Q5 5 16 5" strokeWidth="0.7" opacity="0.5" />
        <path d="M3 21 Q9 20 10 14" strokeWidth="0.9" opacity="0.65" />
        <path d="M21 3 Q20 9 14 10" strokeWidth="0.9" opacity="0.65" />
      </g>
      <rect x="9.5" y="9.5" width="5" height="5" transform="rotate(45 12 12)" fill={GOLD} opacity="0.85" />
    </svg>
  )
}

/**
 * 金屬包角。
 *
 * viewBox 就等於渲染尺寸（1 單位 = 1px），所以路徑裡的 `A 12 12` 精準等於書封板的
 * rounded-xl。差 0.923 倍的話任何要對齊的半徑都得先換算，改一次就錯一次。
 *
 * 上下兩個角各寫一條路徑，不用 -scale-y-100 鏡射：鏡射會把黃銅漸層一起翻過去，
 * 底角的受光面就跑到下方，跟封面其他元素的左上光源打架。
 *
 * 三層構成「折過去」的錯覺：
 *   1. face  ─ 平放在封面上的那一面
 *   2. fold  ─ 沿外緣 4px，稜線受光、翻過去的那面壓暗（＝金屬的厚度）
 *   3. crimp ─ 轉角角平分線上一道折痕，標出金屬被折彎的位置
 * 另外在內緣（凹的那條曲線）畫一道模糊暗線當接觸陰影。外緣的投影會被書封板的
 * overflow 裁掉，而且光在左上、影子往右下正好落在自己底下，所以靠內緣這道才有用。
 */
const CAP = {
  top: {
    face: 'M 0 0 L 28 0 A 12 12 0 0 1 40 12 L 40 40 L 31 40 C 31 24 16 7 0 7 Z',
    edge: 'M 0 0 L 28 0 A 12 12 0 0 1 40 12 L 40 40',
    inner: 'M 31 40 C 31 24 16 7 0 7',
    crimpDark: 'M 32.2 7.8 L 36.1 3.9',
    crimpLight: 'M 32.8 8.4 L 36.7 4.5',
    rivets: [
      [6, 3.5],
      [36.3, 33],
    ],
  },
  bottom: {
    face: 'M 0 40 L 28 40 A 12 12 0 0 0 40 28 L 40 0 L 31 0 C 31 16 16 33 0 33 Z',
    edge: 'M 0 40 L 28 40 A 12 12 0 0 0 40 28 L 40 0',
    inner: 'M 31 0 C 31 16 16 33 0 33',
    crimpDark: 'M 32.2 32.2 L 36.1 36.1',
    crimpLight: 'M 32.8 31.6 L 36.7 35.5',
    rivets: [
      [6, 36.5],
      [36.3, 7],
    ],
  },
} as const

function CornerMetal({ corner }: { corner: 'top' | 'bottom' }) {
  const c = CAP[corner]

  return (
    <svg
      viewBox="0 0 40 40"
      className={`absolute right-0 w-10 h-10 z-30 ${corner === 'top' ? 'top-0' : 'bottom-0'}`}
      style={{ filter: 'drop-shadow(0.5px 1px 1.5px rgb(20 10 4 / 0.4))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`recap-cap-face-${corner}`} x1="0.1" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={BRASS.hi} />
          <stop offset="0.22" stopColor={BRASS.light} />
          <stop offset="0.5" stopColor={BRASS.mid} />
          <stop offset="0.68" stopColor={BRASS.dark} />
          <stop offset="0.86" stopColor={BRASS.glint} />
          <stop offset="1" stopColor={BRASS.base} />
        </linearGradient>
        {/* 折邊：稜線最亮，翻過去的那面最暗 */}
        <linearGradient id={`recap-cap-fold-${corner}`} x1="0.15" y1="0.1" x2="0.9" y2="0.95">
          <stop offset="0" stopColor={BRASS.foldHi} />
          <stop offset="0.3" stopColor={BRASS.foldMid} />
          <stop offset="0.72" stopColor={BRASS.foldDark} />
          <stop offset="1" stopColor={BRASS.foldDeep} />
        </linearGradient>
        {/* 折邊只畫在金屬裡面，描邊的另一半要裁掉 */}
        <clipPath id={`recap-cap-clip-${corner}`}>
          <path d={c.face} />
        </clipPath>
        <filter id={`recap-cap-blur-${corner}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* 接觸陰影：畫在 face 底下，只有溢出到皮革那半看得到 */}
      <path
        d={c.inner}
        fill="none"
        stroke="rgb(20 10 4 / 0.5)"
        strokeWidth="2.4"
        filter={`url(#recap-cap-blur-${corner})`}
      />

      <path d={c.face} fill={`url(#recap-cap-face-${corner})`} />

      <g clipPath={`url(#recap-cap-clip-${corner})`}>
        <path d={c.edge} fill="none" stroke={`url(#recap-cap-fold-${corner})`} strokeWidth="4" />
        <path d={c.edge} fill="none" stroke="rgb(46 30 6 / 0.55)" strokeWidth="1" />
      </g>

      <path d={c.face} fill="none" stroke="rgb(58 38 10 / 0.5)" strokeWidth="0.9" />
      <path d={c.crimpDark} stroke="rgb(46 30 6 / 0.5)" strokeWidth="0.8" strokeLinecap="round" />
      <path d={c.crimpLight} stroke="rgb(255 250 226 / 0.55)" strokeWidth="0.7" strokeLinecap="round" />

      {c.rivets.map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="1.5" fill={BRASS.rivet} />
          <circle cx={cx - 0.5} cy={cy - 0.5} r="0.7" fill={BRASS.rivetHi} />
        </g>
      ))}
    </svg>
  )
}

/** 鎖片：拱頂、內雕框、凹陷的鑰匙孔。 */
function LockPlate() {
  return (
    <svg width="34" height="39" viewBox="0 0 40 46" aria-hidden="true">
      <defs>
        <linearGradient id="recap-brass2" x1="0.1" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={BRASS.hi} />
          <stop offset="0.24" stopColor={BRASS.light} />
          <stop offset="0.54" stopColor={BRASS.mid} />
          <stop offset="0.74" stopColor={BRASS.dark} />
          <stop offset="1" stopColor={BRASS.glint} />
        </linearGradient>
        <radialGradient id="recap-hole" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#120b02" />
          <stop offset="1" stopColor="#3d2d0c" />
        </radialGradient>
      </defs>
      <path
        d="M6 45.2 H34 Q38.8 45.2 38.8 40.4 V20 Q38.8 6 20 1.2 Q1.2 6 1.2 20 V40.4 Q1.2 45.2 6 45.2 Z"
        fill="url(#recap-brass2)"
        stroke="rgb(58 38 10 / 0.55)"
        strokeWidth="1.2"
      />
      <path
        d="M7 41.5 H33 Q35.5 41.5 35.5 39 V20.5 Q35.5 9 20 5 Q4.5 9 4.5 20.5 V39 Q4.5 41.5 7 41.5 Z"
        fill="none"
        stroke="rgb(255 250 226 / 0.48)"
        strokeWidth="0.8"
      />
      <circle cx="20" cy="22" r="5" fill="url(#recap-hole)" />
      <path d="M20 25.5 L23.4 36 H16.6 Z" fill="url(#recap-hole)" />
      <circle cx="20" cy="20.6" r="4.6" fill="none" stroke="rgb(20 12 2 / 0.5)" strokeWidth="0.8" />
      <circle cx="8" cy="12" r="1.7" fill={BRASS.rivet} />
      <circle cx="7.4" cy="11.4" r="0.8" fill={BRASS.rivetHi} />
      <circle cx="32" cy="12" r="1.7" fill={BRASS.rivet} />
      <circle cx="8" cy="39" r="1.7" fill={BRASS.rivet} />
      <circle cx="32" cy="39" r="1.7" fill={BRASS.rivet} />
    </svg>
  )
}

/**
 * 皮革底 + 書脊凸帶 + 金線框 + 四角捲草，封面封底共用的外殼。
 *
 * 分成兩層是為了讓封面成為書最外面那一層：
 *   外層 -inset-2 ─ 皮革與包角，出血到書封板邊緣（p-2 那 8px 也被蓋掉）
 *   內層 inset-2  ─ 書脊、金線框、捲草、封面文字，維持原本以內頁為基準的座標
 *
 * 原本皮革是 inset-0，外面永遠留著一圈書封板的棕色，闔上的書看起來像「一塊皮革
 * 嵌在框裡」。那 8px 只有內頁需要（精裝書的封面確實比書芯大一圈，術語叫 square）。
 * 包角也因此得以貼到書真正的角上，不再被皮革的圓角削掉。
 *
 * 圓角不對稱、跟著書封板：裝訂邊（左）方、書口（右）圓。CornerMetal 只畫在
 * 右側兩個角，路徑裡的半徑是 12，跟這裡的 rounded-r-xl（12px）對齊，轉角才不會
 * 有一邊被裁掉半個像素；左側沒有包角，方角直接對齊書封板的裝訂邊。
 */
function CoverShell({ children }: { children: ReactNode }) {
  return (
    <div className="absolute -inset-2 rounded-l-[3px] rounded-r-xl overflow-hidden">
      <div className="recap-leather absolute inset-0" />

      <div className="absolute inset-2">
        {/* 書脊：三條凸帶，各自上緣受光、下緣落影 */}
        <div className="absolute left-0 top-0 bottom-0 w-7 z-20 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, rgb(20 10 4 / 0.6), rgb(20 10 4 / 0.18) 58%, transparent),' +
                'linear-gradient(to right, rgb(255 228 190 / 0.07), transparent 36%)',
            }}
          />
          {['12%', '38%', '64%'].map(top => (
            <span
              key={top}
              className="absolute -left-0.5 -right-2 h-3.5 rounded-sm"
              style={{
                top,
                background:
                  'linear-gradient(to bottom, rgb(20 10 4 / 0.3) 0%, rgb(255 236 202 / 0.2) 14%,' +
                  'rgb(120 84 60 / 0.1) 46%, rgb(20 10 4 / 0.42) 92%, rgb(20 10 4 / 0.12) 100%)',
              }}
            />
          ))}
        </div>

        {/* 金線框：外框實色，內側細線只有一半亮度，兩條線才有主從。
            四條線各加一道深色偏移當壓凹陰影（下緣／右緣的線用陽性偏移、上緣／
            左緣用陰性偏移，光在左上，凹槽的背光那側才會落影）：光是純色線是畫
            上去的，加了這層才像燙金先壓凹、再上金箔。標題的 textShadow 已經是
            這個工法，金框原本沒有，兩者現在才是同一種做法。 */}
        <div className="absolute z-10 pointer-events-none" style={{ inset: '17px 17px 17px 40px' }}>
          <span
            className="absolute top-0 left-0 right-0"
            style={{ height: 1.5, background: GOLD_LINE, boxShadow: '0 1.5px 0 rgb(20 10 4 / 0.5)' }}
          />
          <span
            className="absolute bottom-0 left-0 right-0"
            style={{ height: 1.5, background: GOLD_LINE, boxShadow: '0 -1.5px 0 rgb(255 244 208 / 0.16)' }}
          />
          <span
            className="absolute top-0 bottom-0 left-0"
            style={{ width: 1.5, background: GOLD_LINE, boxShadow: '1.5px 0 0 rgb(20 10 4 / 0.45)' }}
          />
          <span
            className="absolute top-0 bottom-0 right-0"
            style={{ width: 1.5, background: GOLD_LINE, boxShadow: '-1.5px 0 0 rgb(20 10 4 / 0.45)' }}
          />
          <span className="absolute" style={{ inset: 6, border: `0.5px solid ${GOLD_HAIR}` }} />
        </div>

        <Flourish className="top-3 left-[35px]" />
        <Flourish className="top-3 right-3 -scale-x-100" />
        <Flourish className="bottom-3 left-[35px] -scale-y-100" />
        <Flourish className="bottom-3 right-3 -scale-100" />

        {children}

        {/* 書口：露出的紙緣。深封面配淺書口正是精裝書的樣子。 */}
        <div
          className="absolute left-7 right-1 bottom-0 h-2 z-10"
          style={{
            background:
              'linear-gradient(to right, rgb(20 10 4 / 0.4), transparent 12%, transparent 88%, rgb(20 10 4 / 0.3)),' +
              'repeating-linear-gradient(to bottom, #f0e5cf 0 1px, rgb(126 100 62 / 0.55) 1px 2px)',
          }}
        />
      </div>

      {/* 包角在外層，貼書封板的邊；擺在最後才蓋得住底下所有東西 */}
      <CornerMetal corner="top" />
      <CornerMetal corner="bottom" />
    </div>
  )
}

export function FrontCover({ month, unlocked }: { month: string; unlocked: boolean }) {
  const { t, locale } = useI18n()

  return (
    <CoverShell>
      <div className="absolute z-20 grid place-items-center" style={{ left: 40, right: 17, top: '18%' }}>
        {/* 徽記也壓凹：深色陰影加重、再疊一道極淡的上緣亮邊，跟金線框同一種工法 */}
        <div
          className="relative grid place-items-center"
          style={{ filter: 'drop-shadow(0 1.5px 0.5px rgb(20 10 4 / 0.75)) drop-shadow(0 -0.5px 0 rgb(255 244 208 / 0.12))' }}
        >
          <Roundel size={148} />
          <div className="absolute">
            <TreeMark size={84} />
          </div>
        </div>
      </div>

      <div className="absolute z-20 text-center" style={{ left: 40, right: 17, bottom: '11%' }}>
        <p
          className="recap-cover-face font-semibold text-lg"
          style={{
            color: GOLD,
            letterSpacing: '0.34em',
            textIndent: '0.34em',
            // 加一道上緣亮邊，跟金線框同一種壓凹工法：下緣暗、上緣亮才是「壓」出來的
            textShadow: '0 1.5px 0 rgb(20 10 4 / 0.6), 0 -0.5px 0 rgb(255 244 208 / 0.2)',
          }}
        >
          {t('recap.coverTitle')}
        </p>
        <div className="flex items-center justify-center gap-2 my-2">
          <span className="h-px w-8" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <span className="w-1 h-1 rotate-45" style={{ background: GOLD }} />
          <span className="h-px w-8" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        </div>
        {/* 年月和經文出處走內文的文楷，不吃封面那支 Garamond：襯線體的數字高低
            不齊，放在標題底下會像沒對好。整行換字型而不是只換數字——中文和數字
            混兩種字，基線和字重更難對齊。 */}
        <p
          className="text-[0.66rem]"
          style={{ color: GOLD_DIM, letterSpacing: '0.22em', textIndent: '0.22em' }}
        >
          {formatMonth(month, locale)}
        </p>
      </div>

      {/* 鎖扣。鎖片釘在封面上不會動，鬆開的是從封底繞過來扣住它的那條皮帶。
          鎖片排在皮帶左邊、疊在上層，皮帶末端才會看起來是扣進鎖片裡的。 */}
      <div className="recap-clasp absolute right-0 z-30 flex items-center" style={{ top: '51%', transform: 'translateY(-50%)' }}>
        {/* 光在左上，陰影一律往右下——之前是 -2px（往左），跟皮革亮點、
            書封板漸層的光源矛盾，跟包角的 CornerMetal 一起修 */}
        <span className="relative z-10" style={{ filter: 'drop-shadow(2px 3px 5px rgb(20 10 4 / 0.55))' }}>
          <LockPlate />
        </span>
        {/* 皮帶往左伸到鎖片後面，左側再露出一小截——看得到「進去」也看得到
            「出來」，才讀得成穿過去而不是並排放著。鎖片有 z-10 壓在上層。 */}
        <span
          className="recap-strap relative -ml-11"
          data-open={unlocked}
          style={{
            width: 74,
            height: 38,
            background:
              'linear-gradient(to bottom, rgb(20 10 4 / 0.35) 0%, #634836 16%, #4a3327 55%, #2b1c14 96%)',
            boxShadow: 'inset 0 1px 0 rgb(255 232 196 / 0.12), 0 3px 7px rgb(20 10 4 / 0.5)',
          }}
        >
          {/* 車線通到底，被鎖片蓋住的那段自然看不到 */}
          <span className="absolute left-1.5 right-1.5 top-2 border-t border-dashed" style={{ borderColor: 'rgb(255 228 190 / 0.32)' }} />
          <span className="absolute left-1.5 right-1.5 bottom-2 border-t border-dashed" style={{ borderColor: 'rgb(255 228 190 / 0.32)' }} />
          {/* 左側露出的那截進入鎖片前先壓暗，讀成鑽進去而不是接在旁邊。
              右側那截交給鎖片自己的 drop-shadow，不必再畫一層。 */}
          <span
            className="absolute inset-y-0 left-0 w-3 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent, rgb(20 10 4 / 0.4))' }}
          />
        </span>
      </div>
    </CoverShell>
  )
}

export function BackCover({ name }: { name: string }) {
  const { t } = useI18n()

  return (
    <CoverShell>
      <div className="absolute z-20 grid place-items-center" style={{ left: 40, right: 17, top: '24%' }}>
        <TreeMark size={62} opacity={0.82} />
      </div>

      <div className="absolute z-20 text-center" style={{ left: 40, right: 17, bottom: '18%' }}>
        <p
          className="recap-cover-face text-[0.8rem] leading-loose whitespace-pre-line"
          style={{ color: GOLD, textShadow: '0 1.5px 0 rgb(20 10 4 / 0.6), 0 -0.5px 0 rgb(255 244 208 / 0.2)' }}
        >
          {t('recap.backCoverLine', { name })}
        </p>
        <div className="flex items-center justify-center gap-2 my-2.5">
          <span className="h-px w-8" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <span className="w-1 h-1 rotate-45" style={{ background: GOLD }} />
          <span className="h-px w-8" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        </div>
        <p className="recap-cover-face text-[0.62rem] leading-relaxed" style={{ color: GOLD_DIM }}>
          {t('recap.backCoverSignoff')}
        </p>
        <p className="text-[0.6rem] mt-1" style={{ color: GOLD_DIM }}>
          {t('recap.backCoverRef')}
        </p>
      </div>
    </CoverShell>
  )
}
