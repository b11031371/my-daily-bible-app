import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPin } from '@/lib/quiz-server'

// 計時與計分完全由 fn_submit_quiz_answer 在資料庫端做，client 傳來的時間一律不採信。
// 回應刻意只有 { accepted: true }：對錯要等主持人揭曉，否則有人會靠這支 API 偷看答案。
const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  room_not_found:     { message: '找不到這個房間', status: 404 },
  invalid_player:     { message: '請重新加入房間', status: 403 },
  not_accepting:      { message: '這題已經不能作答了', status: 409 },
  question_not_found: { message: '找不到題目', status: 404 },
  invalid_choice:     { message: '選項不存在', status: 400 },
  too_late:           { message: '時間到了', status: 409 },
  already_answered:   { message: '這題你已經答過了', status: 409 },
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params
  if (!isValidPin(pin)) return NextResponse.json({ error: 'PIN 格式錯誤', code: 'bad_pin' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { playerId, token, questionIndex, choiceIndex } = body ?? {}
  if (
    typeof playerId !== 'string' || typeof token !== 'string' ||
    typeof questionIndex !== 'number' || typeof choiceIndex !== 'number'
  ) {
    return NextResponse.json({ error: '格式錯誤', code: 'bad_request' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.rpc('fn_submit_quiz_answer', {
    p_pin: pin,
    p_player_id: playerId,
    p_token: token,
    p_question_index: Math.trunc(questionIndex),
    p_choice_index: Math.trunc(choiceIndex),
  })

  if (error) {
    const code = Object.keys(ERROR_MESSAGES).find(k => error.message.includes(k))
    const mapped = code ? ERROR_MESSAGES[code] : null
    if (!mapped) console.error('[play/answer] unexpected:', error)
    return NextResponse.json(
      { error: mapped?.message ?? '送出失敗，請再試一次', code: code ?? 'unknown' },
      { status: mapped?.status ?? 500 }
    )
  }

  return NextResponse.json({ accepted: true })
}
