import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { note_date } = await req.json()
  if (!note_date) return NextResponse.json({ error: 'note_date required' }, { status: 400 })

  const { data, error } = await supabase.rpc('fn_checkin', { p_note_date: note_date })
  if (error) {
    const message = error.message.includes('invalid_date')
      ? '只能補簽 3 天內的紀錄'
      : error.message.includes('unique')
      ? '今天已經簽到過了'
      : '簽到失敗，請再試一次'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json(data)
}
