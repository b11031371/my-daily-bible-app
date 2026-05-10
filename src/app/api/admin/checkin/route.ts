import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id, note_date, points } = await req.json()
  const { data, error } = await supabase.rpc('fn_admin_checkin', {
    p_user_id: user_id,
    p_note_date: note_date,
    p_points: points ?? 10,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json(data)
}
