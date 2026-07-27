'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useRoomState } from '@/hooks/useRoomState'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import AnswerGrid from '@/components/quiz/AnswerGrid'
import QuizTimer from '@/components/quiz/QuizTimer'
import Scoreboard from '@/components/quiz/Scoreboard'
import { ANSWER_STYLES } from '@/lib/quiz'
import AnswerShape from '@/components/quiz/AnswerShape'

type Action = 'start' | 'reveal' | 'next' | 'end'

export default function HostConsole({ pin, quizId }: { pin: string; quizId: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const { state, loading, mutate, serverNow } = useRoomState(pin, null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  // origin 只有瀏覽器才知道，掛載後才填，避免 SSR 與首次 render 對不起來
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  // 「結束這場」的確認改成就地展開（見下方 header），不再用會蓋住整個畫面的
  // 原生 confirm()。advance 本身回歸單純執行，確認與否由呼叫端決定。
  const [confirmingEnd, setConfirmingEnd] = useState(false)

  const advance = useCallback(async (action: Action) => {
    setConfirmingEnd(false)
    setBusy(true)
    await fetch(`/api/play/${pin}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    // 不等下一次輪詢，按完立刻拉一次新狀態
    await mutate()
    setBusy(false)
    if (action === 'end') router.refresh()
  }, [pin, mutate, router])

  if (loading || !state) {
    return <p className="max-w-lg mx-auto px-4 pt-10 text-center text-sm text-gray-400">…</p>
  }

  const { room, question, players } = state
  // QR 直接指向 /play/[pin]：掃完就落在填暱稱的畫面，不用再手打 PIN
  const joinLink = origin ? `${origin}/play/${pin}` : ''

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/play/${pin}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8 space-y-5">
      <div className="relative flex items-center justify-between gap-3">
        {/* 確認展開時點別處 = 取消 */}
        {confirmingEnd && (
          <div className="fixed inset-0 z-40" onClick={() => setConfirmingEnd(false)} />
        )}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/quiz" className="text-gray-400 hover:text-gray-600 active:opacity-50 text-lg shrink-0">‹</Link>
          {/* 標題本來就 truncate，確認條展開時再讓一點寬度出來 */}
          <h1 className="page-title font-bold text-heading truncate">{state.quiz.title}</h1>
        </div>
        {room.status !== 'ended' && (
          confirmingEnd ? (
            <div className="relative z-50 flex items-center gap-2 shrink-0">
              <span className="sr-only">{t('quiz.endConfirm')}</span>
              <button
                onClick={() => setConfirmingEnd(false)}
                disabled={busy}
                className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => advance('end')}
                disabled={busy}
                className="border border-danger-line bg-danger-soft rounded-lg px-2.5 py-1 text-xs font-semibold text-danger active:scale-95 transition-transform disabled:opacity-40"
              >
                {t('quiz.endAction')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingEnd(true)}
              disabled={busy}
              className="shrink-0 text-xs text-gray-400 hover:text-danger active:opacity-50 transition-colors disabled:opacity-40"
            >
              {t('quiz.endGame')}
            </button>
          )
        )}
      </div>

      {/* ── 大廳：PIN 大字 + 陸續加入的人 ─────────────────────────────────── */}
      {room.status === 'lobby' && (
        <>
          <div className="bg-surface rounded-2xl p-6 shadow-sm text-center">
            <p className="text-xs text-gray-400">
              {t('quiz.pinLabel', { url: origin.replace(/^https?:\/\//, '') + '/play' })}
            </p>
            <p className="text-5xl font-bold tracking-[0.2em] text-gray-900 mt-2 tabular-nums">{pin}</p>

            {/* 碼色吃主題 token，底色用卡片色，整塊融進卡片。
                金黃主題配白底的明暗對比只有 2.1:1，偏低，所以這裡刻意把碼放大：
                糾錯留在 M（版本 4 = 29×29，模組最大），單一模組約 6px，
                用面積換掃描器在低對比下的容錯。 */}
            {joinLink && (
              <>
                <div className="mt-5 inline-block">
                  <QRCodeSVG
                    value={joinLink}
                    size={200}
                    level="M"
                    marginSize={2}
                    bgColor="var(--color-surface)"
                    fgColor="var(--color-primary-dark)"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2.5">{t('quiz.scanToJoin')}</p>
              </>
            )}

            <button
              onClick={copyLink}
              className="mt-4 block mx-auto text-xs font-medium text-primary-dark hover:underline active:opacity-50"
            >
              {copied ? t('quiz.copied') : t('quiz.copyLink')}
            </button>
          </div>

          <div className="bg-surface rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              {players.length ? t('quiz.playersJoined', { count: players.length }) : t('quiz.waitingPlayers')}
            </p>
            <div className="flex flex-wrap gap-3">
              {players.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-1 w-14">
                  <BibleAvatar seed={p.avatar_seed} className="w-10 h-10" />
                  <span className="text-[11px] text-gray-500 truncate w-full text-center">{p.nickname}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => advance('start')}
            disabled={busy || players.length === 0}
            className="w-full btn-gradient text-gray-900 font-semibold rounded-xl py-3.5 hover:brightness-95 transition-[filter] disabled:opacity-50"
          >
            {t('quiz.startGame')}
          </button>
        </>
      )}

      {/* ── 題目進行中／揭曉 ─────────────────────────────────────────────── */}
      {question && (room.status === 'question' || room.status === 'reveal') && (
        <>
          <div className="bg-surface rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">
                  {t('quiz.questionProgress', { current: question.index + 1, total: room.total_questions })}
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-1.5 break-words">{question.prompt}</p>
              </div>
              {room.status === 'question' && (
                <QuizTimer
                  startedAt={room.question_started_at}
                  limitSeconds={question.time_limit_seconds}
                  serverNow={serverNow}
                />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {t('quiz.answeredCount', { answered: question.answered_count, total: question.total_players })}
            </p>
          </div>

          {/* 主持人畫面常常是投影出來的，所以答題階段這裡跟玩家看到的一樣不含正解 */}
          <AnswerGrid
            options={question.options}
            chosen={null}
            correctIndex={question.correct_index}
            disabled
            onPick={() => {}}
          />

          {room.status === 'reveal' && (
            <>
              {question.distribution && (
                <div className="bg-surface rounded-2xl p-5 shadow-sm space-y-2.5">
                  {question.distribution.map((n, i) => {
                    const pct = question.total_players ? (n / question.total_players) * 100 : 0
                    const style = ANSWER_STYLES[i] ?? ANSWER_STYLES[0]
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${style.bg}`}>
                          <AnswerShape shape={style.shape} className="w-3 h-3 text-white" />
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full ${style.bg} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-xs text-gray-500 tabular-nums">{n}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {question.explanation && (
                <p className="text-sm text-gray-600 bg-primary-light rounded-2xl px-4 py-3">{question.explanation}</p>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{t('quiz.scoreboard')}</p>
                <Scoreboard players={players} limit={5} />
              </div>
            </>
          )}

          <button
            onClick={() => advance(room.status === 'question' ? 'reveal' : 'next')}
            disabled={busy}
            className="w-full btn-gradient text-gray-900 font-semibold rounded-xl py-3.5 hover:brightness-95 transition-[filter] disabled:opacity-50"
          >
            {room.status === 'question'
              ? t('quiz.revealAnswer')
              : question.index + 1 >= room.total_questions
                ? t('quiz.seeResults')
                : t('quiz.nextQuestion')}
          </button>
        </>
      )}

      {/* ── 結算 ─────────────────────────────────────────────────────────── */}
      {room.status === 'ended' && (
        <>
          <p className="text-sm font-semibold text-gray-700">{t('quiz.finalResults')}</p>
          <Scoreboard players={players} />
          <Link
            href={`/quiz/${quizId}/edit`}
            className="block text-center border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {t('quiz.edit')}
          </Link>
        </>
      )}
    </div>
  )
}
