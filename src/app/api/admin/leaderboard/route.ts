import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { period_type, period_label } = await req.json()
  const { error } = await supabase.rpc('fn_rebuild_leaderboard', {
    p_period_type: period_type,
    p_period_label: period_label,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ success: true })
}
