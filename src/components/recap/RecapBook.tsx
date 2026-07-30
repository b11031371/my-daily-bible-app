'use client'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { RecapAnimProvider } from '@/components/recap/RecapAnim'

export interface BookPage {
  key: string
  node: ReactNode
}

interface Props {
  pages: BookPage[]
  /** 第一頁是上了鎖的封面：任何一下點擊都會解鎖並翻開 */
  locked?: boolean
  onUnlock?: () => void
}

// 鎖片轉開的時間，跟 .recap-lock 的 transition 對齊。等它演完才翻頁，
// 不然鎖還在動、書就已經翻走了。
const UNLOCK_MS = 480

// 手指要移動幾 px 才算在拖頁。低於這個距離都當成點擊，日曆格子才點得到。
const DRAG_START = 10
// 放開時翻過這個進度就補完，否則彈回。
const COMMIT_AT = 0.32
const AUTO_MS = 620
// 手指要滑過螢幕寬度的幾成，才算把一頁整個翻過去。太大會覺得紙很重拖不動。
const DRAG_FULL = 0.5
// 快速一撥（無論滑了多遠）就算數的速度門檻，px/ms。0.5 大約是「輕輕彈一下」
// 的手感——純看距離的話，短而快的撥動常常還沒滑到 COMMIT_AT 就放開了，
// 手感會覺得「要滑很長一段才翻得動」。
const FLICK_PX_MS = 0.5
// 紙堆邊緣最多畫幾 px。太厚會變成一塊色帶，看不出是一張張紙；
// 也不能超過書封板的內距（p-2 = 8px），否則會溢出書外。
const MAX_SHEETS = 6

/** from 翻到 to；p 是這次翻頁的進度 0→1，拖曳時由手指位置決定。 */
interface Turn {
  from: number
  to: number
  dir: 1 | -1
  p: number
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1)

/**
 * 這一頁自己翻了多少（0=平放, 1=完全翻過去）。
 *
 * 往前翻時 p 從 0 跑到 1，但紙是從「已翻過」回到「平放」，所以 q 要反過來。
 */
const sheetTurn = (turn: Turn) => (turn.dir === 1 ? turn.p : 1 - turn.p)

/**
 * 翻動中那張紙的姿態。
 *
 * rotateZ 讓右下角先掀起來（支點在左下，見 .recap-flipper 的 transform-origin），
 * translateZ 讓紙離開書面。兩者都用 sin 取峰值在中段——紙抓起來、翻過去、再落下。
 */
function sheetStyle(turn: Turn): CSSProperties {
  const q = sheetTurn(turn)
  const lift = Math.sin(Math.PI * q)
  return {
    // 停在 172 度而不是 180：完全貼平時那頁會變成一條零寬度的線，邊緣鋸齒很明顯
    transform: `rotateZ(${-7 * lift}deg) rotateY(${-172 * q}deg) translateZ(${16 * lift}px)`,
  }
}

/**
 * 回顧手冊。手指左右拖動翻頁，紙即時跟著手走。
 *
 * 翻頁進度用 JS 的數值驅動而不是 CSS keyframes：拖到一半放開時要能從當下的角度
 * 接著跑完或彈回，而 keyframes 一律從 0 開始，做不到這件事。
 *
 * 同時只放兩層在 DOM 裡：底層是翻完之後會看到的那頁，上層是正在翻的那張紙。
 * 全部頁面都掛著的話，每頁的 useState（例如日曆選了哪天）會在背景一直活著，
 * 而且螢幕閱讀器會把看不見的頁面也讀出來。
 */
export default function RecapBook({ pages, locked = false, onUnlock }: Props) {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const [turn, setTurn] = useState<Turn | null>(null)
  // 同一份翻頁狀態也存一份在 ref：放手時要讀當下的進度來決定補完或彈回，
  // 而在 setTurn 的 updater 裡做這件事會被 StrictMode 跑兩次，開出兩個互相打架的 rAF。
  const turnRef = useRef<Turn | null>(null)
  const raf = useRef<number>(null)

  const applyTurn = useCallback((t: Turn | null) => {
    turnRef.current = t
    setTurn(t)
  }, [])
  // 拖曳狀態放 ref：每次 pointermove 都寫 state 會多出一堆重繪。
  // lastX/lastT/vx 只在 active 之後才有意義，用來在放開時判斷是不是快速一撥。
  const drag = useRef<{
    x: number; y: number; active: boolean; width: number
    lastX: number; lastT: number; vx: number
  } | null>(null)
  const justDragged = useRef(false)
  // 翻到過的頁，用來決定要不要再演一次進場動畫（見 RecapAnim）
  const seen = useRef(new Set<string>())

  const last = pages.length - 1
  const busy = turn !== null

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  // 把進度推到 target（1=翻完, 0=彈回），到了就收尾。
  const settle = useCallback((start: Turn, target: 0 | 1) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finish = () => {
      applyTurn(null)
      if (target === 1) setIndex(start.to)
    }
    if (reduced) return finish()

    const from = start.p
    const t0 = performance.now()
    const dur = AUTO_MS * Math.abs(target - from)
    const tick = (now: number) => {
      const k = dur === 0 ? 1 : clamp01((now - t0) / dur)
      const p = from + (target - from) * easeInOut(k)
      applyTurn({ ...start, p })
      if (k < 1) raf.current = requestAnimationFrame(tick)
      else finish()
    }
    raf.current = requestAnimationFrame(tick)
  }, [applyTurn])

  const go = useCallback((to: number) => {
    if (busy || to < 0 || to > last || to === index) return
    const start: Turn = { from: index, to, dir: to > index ? 1 : -1, p: 0 }
    applyTurn(start)
    settle(start, 1)
  }, [applyTurn, busy, index, last, settle])

  // ── 拖曳 ───────────────────────────────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy) return
    drag.current = {
      x: e.clientX, y: e.clientY, active: false, width: e.currentTarget.clientWidth,
      lastX: e.clientX, lastT: performance.now(), vx: 0,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x

    if (!d.active) {
      if (Math.abs(dx) < DRAG_START) return
      // 手指偏垂直就整個放棄這一次：頁面內容可以捲（摘要頁常常要捲），
      // 斜著滑的時候不該一邊捲一邊翻頁。放棄而不是等它轉向，
      // 因為捲動途中手指本來就會左右晃。
      if (Math.abs(e.clientY - d.y) > Math.abs(dx)) { drag.current = null; return }
      const dir: 1 | -1 = dx < 0 ? 1 : -1
      const to = index + dir
      if (to < 0 || to > last) { drag.current = null; return }
      d.active = true
      justDragged.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      applyTurn({ from: index, to, dir, p: 0 })
      return
    }

    // 扣掉起步的門檻，手指一超過就從 0 開始跟，不會突然跳一段。
    // 一定要照 dir 算有方向性的位移，不能用 |dx|：手指往回滑超過起點時
    // （想放棄這次翻頁），|dx| 會因為跑到另一側而重新變大，進度就會像
    // 沒放開一樣繼續往前跑，而不是彈回去——這是滑動翻頁一直感覺卡卡的主因。
    const prev = turnRef.current
    if (prev) {
      const travelled = (prev.dir === 1 ? -dx : dx) - DRAG_START
      applyTurn({ ...prev, p: clamp01(travelled / (d.width * DRAG_FULL)) })
    }

    // 記瞬時速度，放開的那一刻用來判斷是不是快速一撥（見 onPointerUp）。
    const now = performance.now()
    const dt = now - d.lastT
    if (dt > 0) d.vx = (e.clientX - d.lastX) / dt
    d.lastX = e.clientX
    d.lastT = now
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    const prev = turnRef.current
    if (prev) {
      // 快速撥一下就算數，不用管滑了多遠：純看距離的話，短而快的撥動常常
      // 還沒滑過 COMMIT_AT 就放開了，翻頁感覺要滑很長一段才有反應。
      // 方向要跟 dir 一致——反方向撥得再快也是想取消，不是想翻。
      const flicked = Math.abs(d.vx) > FLICK_PX_MS && (prev.dir === 1 ? d.vx < 0 : d.vx > 0)
      settle(prev, prev.p > COMMIT_AT || flicked ? 1 : 0)
    }
    // 拖曳結束後那一下的 click 要吃掉，否則會誤觸底下的日曆格子
    setTimeout(() => { justDragged.current = false }, 0)
  }

  /**
   * 上鎖狀態下，畫面上任何一下點擊都解鎖並翻開。
   *
   * 監聽掛在 document 而不是書本身：鎖是一個很強的暗示，使用者可能點鎖、點書、
   * 也可能就是隨手點一下畫面，全部都該有反應。
   */
  useEffect(() => {
    if (!locked) return
    // timer 沒清掉的話：解鎖後 onUnlock 觸發重render，locked 變 false，這個
    // effect 會清掉監聽器，但已經排進佇列的 setTimeout 不會跟著消失，它抓住的
    // 是「上鎖那一刻」的 go——那時 busy 還是 false，480ms 後真的執行時完全不知道
    // 使用者可能早就手動點了下一頁、翻頁動畫正在跑，guard 擋不住，就翻第二次。
    let timer: ReturnType<typeof setTimeout> | undefined
    const onDown = () => {
      onUnlock?.()
      timer = setTimeout(() => go(1), UNLOCK_MS)
    }
    document.addEventListener('pointerdown', onDown, { once: true })
    return () => {
      document.removeEventListener('pointerdown', onDown)
      clearTimeout(timer)
    }
  }, [locked, onUnlock, go])

  // 桌機用左右鍵翻。掛在 window 上而不是容器，使用者才不必先點一下才有焦點。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1)
      if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index])

  // 翻過的頁堆在左邊、還沒翻的堆在右邊，厚度隨進度此消彼長。
  const leftSheets = Math.round((index / last) * MAX_SHEETS)
  const baseIndex = turn ? (turn.dir === 1 ? turn.to : turn.from) : index
  const q = turn ? sheetTurn(turn) : 0

  // 底層那頁第一次露臉才演動畫。在 effect 裡登記，這一輪 render 讀到的還是「沒看過」。
  const baseKey = pages[baseIndex].key
  useEffect(() => { seen.current.add(baseKey) }, [baseKey])

  return (
    // 寬度由書自己決定並置中，而不是交給外層容器：彈窗和 /recap 頁面才會是同一本書，
    // 左右也才留得住看得出來的邊界，讀起來像一件物品而不是一個滿版介面。
    <div className="recap-book w-full max-w-80 mx-auto">
      {/* 書封板要裁切：翻到 90 度之後那張紙會轉到書脊左側，不裁的話會整片露在書外。
          真書的翻頁是沒入書縫，不是飛出書本。紙堆邊緣的寬度上限小於內距，不受影響。 */}
      {/* 圓角不對稱：裝訂邊（左）是方的，書口（右）才磨圓——真書的角就是這樣，
          左右同圓只有印刷品才會做。書封板／內頁／翻動中那張紙全部套同一組半徑，
          翻頁時角才不會忽方忽圓。 */}
      <div className="recap-board relative rounded-l-[3px] rounded-r-xl p-2 overflow-hidden">
        <div
          className="relative h-[min(72dvh,500px)] min-h-104 touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={e => { if (justDragged.current) { e.preventDefault(); e.stopPropagation() } }}
        >
          {/* 紙堆邊緣。放在內頁下層，只露出邊緣那幾 px。 */}
          <Sheets side="left" sheets={leftSheets} />
          <Sheets side="right" sheets={MAX_SHEETS - leftSheets} />

          {/* key 讓翻頁時整頁重新掛載，第一次翻到的頁才會演進場動畫。
              isolate：封面/封底內部自己用 z-10/20/30 疊層（文字疊皮革、
              包角疊金框…），這層本身沒有 z-index、不會自成堆疊環境的話，
              那些 z 值會直接冒到 .recap-book 最外層，蓋過旁邊 .recap-flipper
              （翻動中的那張紙）——翻到封面/封底前一頁會看到兩頁疊在一起
              的殘影，就是這裡漏的。 */}
          <div key={baseKey} className="absolute inset-0 isolate">
            <RecapAnimProvider animate={!seen.current.has(baseKey)}>
              {pages[baseIndex].node}
            </RecapAnimProvider>
          </div>

          {turn && (
            <>
              {/* 翻動的紙投在下一頁上的影子，隨紙掃過去而拉開變淡 */}
              <div
                className="absolute inset-y-0 left-0 w-2/3 rounded-l-[3px] rounded-r-lg pointer-events-none origin-left"
                style={{
                  background: 'linear-gradient(to right, rgb(92 66 36 / 0.45), transparent)',
                  opacity: 0.3 * (1 - q),
                  transform: `scaleX(${0.06 + 0.94 * q})`,
                }}
                aria-hidden="true"
              />
              <div className="recap-flipper absolute inset-0" style={sheetStyle(turn)} aria-hidden="true">
                <div className="recap-face recap-face-front">
                  {/* 翻動中那張紙上的內容一律不演動畫：往前翻時它是剛看完的那頁
                      （內容早就擺好了）、往後翻時是先前看過的頁。讓它一邊被翻走
                      一邊淡入，紙會看起來像剛被印出來。 */}
                  <RecapAnimProvider animate={false}>
                    {pages[turn.dir === 1 ? turn.from : turn.to].node}
                  </RecapAnimProvider>
                  {/* 紙的彎曲明暗：立起來時擋光最多，落下時散掉 */}
                  <div
                    className="absolute inset-0 rounded-l-[3px] rounded-r-lg pointer-events-none"
                    style={{
                      background: 'linear-gradient(to right, rgb(60 40 20 / 0.55), rgb(60 40 20 / 0.12) 38%, transparent 72%)',
                      opacity: 0.12 + 0.42 * Math.sin(Math.PI * q),
                    }}
                  />
                </div>
                {/* 紙的背面。少了它，翻過 90 度後那頁會直接消失，像內容被抽走。 */}
                <div className="recap-face recap-face-back recap-page rounded-l-[3px] rounded-r-lg recap-paper" />
              </div>
            </>
          )}

          {/* 書脊壓在內頁左緣上方，最後畫才蓋得住 */}
          <div className="recap-spine-band absolute left-0 top-0 bottom-0 w-8 rounded-l-[3px] pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <NavButton onClick={() => go(index - 1)} disabled={index === 0} label={t('recap.prevPage')}>
          <CaretLeft size={16} weight="bold" />
        </NavButton>

        {/* 間距 8px 剛好等於左右各撐 4px 的命中區，相鄰兩點不會搶同一塊 */}
        <div className="flex items-center gap-2">
          {pages.map((p, i) => (
            <button
              key={p.key}
              type="button"
              onClick={() => go(i)}
              aria-label={t('recap.goToPage', { n: i + 1 })}
              aria-current={i === index}
              // 命中區用偽元素往外撐（上下各 16px、左右各 4px），視覺尺寸不變：
              // 6px 的點用手指按不中，但把點本身放大會讓整排導覽變成一條粗線。
              // 左右只撐 4px 是為了不跟隔壁的點搶同一塊區域（間距 6px）。
              className={`relative rounded-full transition-all before:absolute before:content-[''] before:-inset-y-4 before:-inset-x-1 ${
                i === index ? 'w-4 h-1.5 bg-primary-dark' : 'w-1.5 h-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <NavButton onClick={() => go(index + 1)} disabled={index === last} label={t('recap.nextPage')}>
          <CaretRight size={16} weight="bold" />
        </NavButton>
      </div>
    </div>
  )
}

function Sheets({ side, sheets }: { side: 'left' | 'right'; sheets: number }) {
  if (sheets <= 0) return null
  return (
    <div
      aria-hidden="true"
      className={`recap-sheets absolute top-1.5 bottom-1.5 ${
        side === 'left' ? 'left-0 -translate-x-full rounded-l-sm' : 'right-0 translate-x-full rounded-r-sm'
      }`}
      style={{ '--sheets': sheets } as CSSProperties}
    />
  )
}

function NavButton({
  onClick, disabled, label, children,
}: {
  onClick: () => void; disabled: boolean; label: string; children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // 同樣用偽元素把命中區撐到 44px，圖示維持 32px：導覽列的高度不變，
      // 手指按得中的範圍變大。
      className="relative w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 active:opacity-50 disabled:opacity-25 transition-colors before:absolute before:content-[''] before:-inset-1.5"
    >
      {children}
    </button>
  )
}
