import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findRoomByPin, isValidPin } from '@/lib/quiz-server'
import { QUIZ_CONFIG, generatePlayerToken, randomAvatarSeed } from '@/lib/quiz'

/**
 * 加入房間。登入用戶直接沿用 profiles 的暱稱與頭像；訪客自己填暱稱。
 * 兩者都拿到一組 { playerId, token }，之後每次 state / answer 都要帶回來，
 * 這是訪客在沒有 auth.uid() 的情況下唯一的身分證明。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params
  if (!isValidPin(pin)) return NextResponse.json({ error: 'PIN 格式錯誤', code: 'bad_pin' }, { status: 400 })

  const admin = createAdminClient()
  const room = await findRoomByPin(admin, pin)
  if (!room || room.status === 'ended') {
    return NextResponse.json({ error: '找不到這個房間', code: 'room_not_found' }, { status: 404 })
  }
  if (room.status !== 'lobby') {
    return NextResponse.json({ error: '遊戲已經開始了', code: 'already_started' }, { status: 409 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user && user.id === room.host_id) {
    return NextResponse.json({ error: '你是這場的主持人', code: 'is_host' }, { status: 409 })
  }

  // 登入用戶重新整理後應該回到原本的身分，不要變成第二個玩家
  if (user) {
    const { data: existing } = await admin
      .from('quiz_room_players')
      .select('id, token')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) return NextResponse.json({ playerId: existing.id, token: existing.token })
  }

  let nickname: string
  let avatarSeed: string

  if (user) {
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name, avatar_seed')
      .eq('id', user.id)
      .single()
    nickname = profile?.display_name ?? '玩家'
    avatarSeed = profile?.avatar_seed ?? randomAvatarSeed()
  } else {
    if (!room.allow_guests) {
      return NextResponse.json({ error: '這場需要登入才能加入', code: 'login_required' }, { status: 403 })
    }
    const body = await req.json().catch(() => ({}))
    nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : ''
    if (!nickname) return NextResponse.json({ error: '請輸入暱稱', code: 'nickname_required' }, { status: 400 })
    nickname = nickname.slice(0, QUIZ_CONFIG.maxNicknameLength)
    avatarSeed = randomAvatarSeed()
  }

  const token = generatePlayerToken()
  const { data: player, error } = await admin
    .from('quiz_room_players')
    .insert({ room_id: room.id, user_id: user?.id ?? null, nickname, avatar_seed: avatarSeed, token })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique_violation，房內暱稱撞名
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: '這個暱稱有人用了，換一個吧', code: 'nickname_taken' }, { status: 409 })
    }
    return NextResponse.json({ error: '加入失敗，請再試一次' }, { status: 500 })
  }

  return NextResponse.json({ playerId: player.id, token })
}
