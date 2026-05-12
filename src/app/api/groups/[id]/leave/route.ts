import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('group_members')
    .update({ left_at: new Date().toISOString() })
    .eq('group_id', id)
    .eq('user_id', user.id)
    .is('left_at', null)

  if (error) return NextResponse.json({ error: '退出失敗' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
