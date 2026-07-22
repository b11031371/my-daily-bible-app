import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findRoomByPin, isValidPin } from '@/lib/quiz-server'
import type { QuizQuestionView, QuizRoomState } from '@/types/app'

/**
 * 房間狀態的唯一出口。玩家端不直接讀資料庫，全部走這裡，
 * 由伺服器依 room.status 決定哪些欄位可以送出去。
 *
 * 關鍵不變式：status !== 'reveal' 時，回應裡絕對不能出現 correct_index、
 * explanation 或各選項人數分布。
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params
  if (!isValidPin(pin)) return NextResponse.json({ error: 'PIN 格式錯誤', code: 'bad_pin' }, { status: 400 })

  const admin = createAdminClient()
  const room = await findRoomByPin(admin, pin)
  if (!room) return NextResponse.json({ error: '找不到這個房間', code: 'room_not_found' }, { status: 404 })

  const playerId = req.nextUrl.searchParams.get('playerId')
  const token = req.nextUrl.searchParams.get('token')

  const [{ data: quiz }, { data: questions }, { data: players }] = await Promise.all([
    admin.from('quizzes').select('title').eq('id', room.quiz_id).single(),
    admin
      .from('quiz_questions')
      .select('order_index, prompt, options, correct_index, explanation, time_limit_seconds')
      .eq('quiz_id', room.quiz_id)
      .order('order_index'),
    admin
      .from('quiz_room_players')
      .select('id, nickname, avatar_seed, score, token, user_id')
      .eq('room_id', room.id)
      .order('score', { ascending: false })
      .order('joined_at'),
  ])

  const allPlayers = players ?? []
  const allQuestions = questions ?? []

  // 玩家靠 playerId + token 認，主持人才需要看 session。
  // 這支 API 在答題階段每 800ms 被打一次，所以身分確認要盡量不花網路：
  // 玩家對得上 token 就直接收工，不必再問一次 auth。
  const mePlayer = playerId && token
    ? allPlayers.find(p => p.id === playerId && p.token === token) ?? null
    : null
  const isHost = mePlayer ? false : (await getUser())?.id === room.host_id

  if (!isHost && !mePlayer) {
    return NextResponse.json({ error: '你不在這個房間裡', code: 'not_in_room' }, { status: 403 })
  }

  const current = room.current_index >= 0
    ? allQuestions.find(q => q.order_index === room.current_index) ?? null
    : null

  let question: QuizQuestionView | null = null
  let myAnswered = false

  if (current && (room.status === 'question' || room.status === 'reveal')) {
    const { data: answers } = await admin
      .from('quiz_answers')
      .select('player_id, choice_index, points')
      .eq('room_id', room.id)
      .eq('question_index', room.current_index)

    const rows = answers ?? []
    const mine = mePlayer ? rows.find(a => a.player_id === mePlayer.id) ?? null : null
    myAnswered = !!mine

    question = {
      index: current.order_index,
      prompt: current.prompt,
      options: current.options,
      time_limit_seconds: current.time_limit_seconds,
      answered_count: rows.length,
      total_players: allPlayers.length,
    }

    // 揭曉之後才補上答案相關欄位
    if (room.status === 'reveal') {
      const distribution = current.options.map(
        (_, i) => rows.filter(a => a.choice_index === i).length
      )
      question.correct_index = current.correct_index
      question.explanation = current.explanation
      question.distribution = distribution
      question.my_choice = mine ? mine.choice_index : null
      question.my_points = mine?.points ?? 0
    }
  }

  const state: QuizRoomState = {
    server_now: new Date().toISOString(),
    room: {
      pin: room.pin,
      status: room.status,
      current_index: room.current_index,
      total_questions: allQuestions.length,
      question_started_at: room.question_started_at,
    },
    quiz: { title: quiz?.title ?? '' },
    is_host: isHost,
    me: mePlayer
      ? {
          player_id: mePlayer.id,
          nickname: mePlayer.nickname,
          avatar_seed: mePlayer.avatar_seed,
          score: mePlayer.score,
          rank: allPlayers.findIndex(p => p.id === mePlayer.id) + 1,
          answered: myAnswered,
        }
      : null,
    players: allPlayers.map(p => ({
      id: p.id,
      nickname: p.nickname,
      avatar_seed: p.avatar_seed,
      score: p.score,
    })),
    question,
  }

  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } })
}
