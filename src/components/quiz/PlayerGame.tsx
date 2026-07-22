'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/components/i18n/I18nProvider'
import { useRoomState, type PlayerIdentity } from '@/hooks/useRoomState'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_CONFIG } from '@/lib/quiz'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import AnswerGrid from '@/components/quiz/AnswerGrid'
import QuizTimer from '@/components/quiz/QuizTimer'
import Scoreboard from '@/components/quiz/Scoreboard'

// 身分存在 sessionStorage：關掉分頁就消失，同一支手機換人玩不會沿用上一個人的身分。
const storageKey = (pin: string) => `quiz-player:${pin}`

function readIdentity(pin: string): PlayerIdentity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(pin))
    return raw ? (JSON.parse(raw) as PlayerIdentity) : null
  } catch {
    return null
  }
}

export default function PlayerGame({ pin }: { pin: string }) {
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setIdentity(readIdentity(pin))
    setReady(true)
  }, [pin])

  const saveIdentity = useCallback((next: PlayerIdentity) => {
    sessionStorage.setItem(storageKey(pin), JSON.stringify(next))
    setIdentity(next)
  }, [pin])

  const clearIdentity = useCallback(() => {
    sessionStorage.removeItem(storageKey(pin))
    setIdentity(null)
  }, [pin])

  if (!ready) return null
  if (!identity) return <JoinForm pin={pin} onJoined={saveIdentity} />
  return <GameView pin={pin} identity={identity} onLostIdentity={clearIdentity} />
}

// ── 加入房間 ────────────────────────────────────────────────────────────────
function JoinForm({ pin, onJoined }: { pin: string; onJoined: (id: PlayerIdentity) => void }) {
  const { t } = useI18n()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 登入的人直接用帳號的暱稱與頭像，不用再填一次
  useEffect(() => {
    void (async () => {
      const { data } = await createClient().auth.getUser()
      setLoggedIn(!!data.user)
    })()
  }, [])

  async function join() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/play/${pin}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(
        data.code === 'nickname_taken' ? t('quiz.nicknameTaken')
        : data.code === 'already_started' ? t('quiz.alreadyStarted')
        : data.code === 'room_not_found' ? t('quiz.roomNotFound')
        : data.error ?? t('quiz.joinFail')
      )
      return
    }
    onJoined({ playerId: data.playerId, token: data.token })
  }

  const canJoin = loggedIn === true || nickname.trim().length > 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <p className="text-xs text-gray-400">PIN</p>
          <p className="text-3xl font-bold tracking-[0.2em] text-gray-900 tabular-nums">{pin}</p>
        </div>

        {loggedIn === false && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">{t('quiz.nickname')}</label>
            <input
              autoFocus
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={QUIZ_CONFIG.maxNicknameLength}
              placeholder={t('quiz.nicknamePlaceholder')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          onClick={join}
          disabled={loading || loggedIn === null || !canJoin}
          className="w-full btn-gradient text-gray-900 font-semibold rounded-xl py-3.5 hover:brightness-95 transition-[filter] disabled:opacity-40"
        >
          {loading ? t('quiz.joining') : t('quiz.joinGame')}
        </button>

        <Link href="/play" className="block text-center text-sm text-gray-400 hover:text-gray-600">
          {t('quiz.backToQuiz')}
        </Link>
      </div>
    </div>
  )
}

// ── 遊戲畫面 ────────────────────────────────────────────────────────────────
function GameView({
  pin, identity, onLostIdentity,
}: { pin: string; identity: PlayerIdentity; onLostIdentity: () => void }) {
  const { t } = useI18n()
  const { state, error, loading, mutate, serverNow } = useRoomState(pin, identity)

  // 樂觀顯示：送出後馬上鎖畫面，不等下一次輪詢確認
  const [chosen, setChosen] = useState<number | null>(null)
  const [expired, setExpired] = useState(false)
  const answeredIndex = useRef<number | null>(null)

  const currentIndex = state?.room.current_index ?? -1
  useEffect(() => {
    if (answeredIndex.current !== currentIndex) {
      answeredIndex.current = currentIndex
      setChosen(null)
      setExpired(false)
    }
  }, [currentIndex])

  // token 對不上（房間被回收、或換了一場）就退回加入畫面
  useEffect(() => {
    if ((error as { code?: string } | undefined)?.code === 'not_in_room') onLostIdentity()
  }, [error, onLostIdentity])

  const onExpire = useCallback(() => setExpired(true), [])

  async function pick(index: number) {
    if (chosen !== null || !state?.question) return
    setChosen(index)
    const res = await fetch(`/api/play/${pin}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: identity.playerId,
        token: identity.token,
        questionIndex: state.question.index,
        choiceIndex: index,
      }),
    })
    // 被拒（逾時、換題）就把選擇收回去，畫面不要假裝送出成功
    if (!res.ok) setChosen(null)
    void mutate()
  }

  if (loading || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-gray-400">{error ? t('quiz.roomNotFound') : '…'}</p>
      </div>
    )
  }

  const { room, question, me, players } = state
  const locked = chosen !== null || me?.answered === true || expired

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-4 py-5">
      {/* 自己的名次與分數常駐在最上面 */}
      {me && (
        <div className="flex items-center gap-2.5 mb-4">
          <BibleAvatar seed={me.avatar_seed} className="w-9 h-9" />
          <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-800">{me.nickname}</span>
          <span className="text-sm font-bold text-gray-900 tabular-nums">{me.score}</span>
        </div>
      )}

      {room.status === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-lg font-semibold text-gray-900">{t('quiz.youAreIn')}</p>
          <p className="text-sm text-gray-400">{t('quiz.waitingStart')}</p>
          <p className="text-xs text-gray-400 mt-4">{t('quiz.playersJoined', { count: players.length })}</p>
        </div>
      )}

      {question && room.status === 'question' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-400">
                {t('quiz.questionProgress', { current: question.index + 1, total: room.total_questions })}
              </p>
              <p className="text-lg font-semibold text-gray-900 mt-1.5 break-words">{question.prompt}</p>
            </div>
            <QuizTimer
              startedAt={room.question_started_at}
              limitSeconds={question.time_limit_seconds}
              serverNow={serverNow}
              onExpire={onExpire}
            />
          </div>

          <AnswerGrid
            options={question.options}
            chosen={chosen}
            disabled={locked}
            onPick={pick}
          />

          {locked && (
            <p className="text-center text-sm text-gray-400">
              {expired && chosen === null && !me?.answered ? t('quiz.timeUp') : t('quiz.answerLocked')}
            </p>
          )}
          {locked && !expired && (
            <p className="text-center text-xs text-gray-400">{t('quiz.waitingOthers')}</p>
          )}
        </div>
      )}

      {question && room.status === 'reveal' && (
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <p className="text-lg font-semibold text-gray-900 break-words">{question.prompt}</p>
          </div>

          <div className="text-center">
            {question.my_choice === null || question.my_choice === undefined ? (
              <p className="text-base font-semibold text-gray-400">{t('quiz.noAnswer')}</p>
            ) : question.my_choice === question.correct_index ? (
              <>
                <p className="text-xl font-bold text-success">{t('quiz.correct')}</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">
                  {t('quiz.pointsEarned', { points: question.my_points ?? 0 })}
                </p>
              </>
            ) : (
              <p className="text-xl font-bold text-danger">{t('quiz.wrong')}</p>
            )}
          </div>

          <AnswerGrid
            options={question.options}
            chosen={question.my_choice ?? null}
            correctIndex={question.correct_index}
            disabled
            onPick={() => {}}
          />

          {question.explanation && (
            <p className="text-sm text-gray-600 bg-primary-light rounded-2xl px-4 py-3">{question.explanation}</p>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">{t('quiz.scoreboard')}</p>
            <Scoreboard players={players} highlightId={me?.player_id} limit={5} />
          </div>
        </div>
      )}

      {room.status === 'ended' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{t('quiz.finalResults')}</p>
            {me && (
              <p className="text-sm text-gray-500 mt-1">
                {t('quiz.rankOf', { rank: me.rank, total: players.length })} · {t('quiz.yourScore')} {me.score}
              </p>
            )}
          </div>
          <Scoreboard players={players} highlightId={me?.player_id} />
          <Link
            href="/play"
            className="block text-center border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('quiz.backToQuiz')}
          </Link>
        </div>
      )}
    </div>
  )
}
