import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findRoomByPin, isValidPin } from '@/lib/quiz-server'
import type { Database } from '@/types/database'

type RoomUpdate = Database['public']['Tables']['quiz_rooms']['Update']
type Action = 'start' | 'reveal' | 'next' | 'end'

// 主持人推進遊戲。狀態機刻意收在這一支，客戶端只送動作名稱。
// question_started_at 一律由伺服器寫 NOW()，倒數與計分才有共同基準。
export async function POST(req: NextRequest, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params
  if (!isValidPin(pin)) return NextResponse.json({ error: 'PIN 格式錯誤', code: 'bad_pin' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const room = await findRoomByPin(admin, pin)
  if (!room) return NextResponse.json({ error: '找不到這個房間', code: 'room_not_found' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: '只有主持人能操作', code: 'not_host' }, { status: 403 })
  if (room.status === 'ended') return NextResponse.json({ error: '這場已經結束了', code: 'room_ended' }, { status: 409 })

  const body = await req.json().catch(() => ({}))
  const action = body?.action as Action
  if (!['start', 'reveal', 'next', 'end'].includes(action)) {
    return NextResponse.json({ error: '格式錯誤', code: 'bad_request' }, { status: 400 })
  }

  const { count: total } = await admin
    .from('quiz_questions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', room.quiz_id)
  const totalQuestions = total ?? 0

  const now = new Date().toISOString()
  let patch: RoomUpdate

  switch (action) {
    case 'start':
      if (room.status !== 'lobby') return NextResponse.json({ error: '已經開始了', code: 'bad_state' }, { status: 409 })
      if (totalQuestions === 0) return NextResponse.json({ error: '這份測驗還沒有題目', code: 'no_questions' }, { status: 400 })
      patch = { status: 'question', current_index: 0, question_started_at: now }
      break

    case 'reveal':
      if (room.status !== 'question') return NextResponse.json({ error: '現在不能揭曉', code: 'bad_state' }, { status: 409 })
      patch = { status: 'reveal' }
      break

    case 'next': {
      if (room.status !== 'reveal') return NextResponse.json({ error: '要先揭曉答案', code: 'bad_state' }, { status: 409 })
      const nextIndex = room.current_index + 1
      patch = nextIndex >= totalQuestions
        ? { status: 'ended', ended_at: now }
        : { status: 'question', current_index: nextIndex, question_started_at: now }
      break
    }

    case 'end':
      patch = { status: 'ended', ended_at: now }
      break
  }

  const { error } = await admin.from('quiz_rooms').update(patch).eq('id', room.id)
  if (error) return NextResponse.json({ error: '操作失敗，請再試一次' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
