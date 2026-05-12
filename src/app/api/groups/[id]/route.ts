import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user is a current member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .is('left_at', null)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: '只有群組成員可以改名' }, { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: '名稱不能為空' }, { status: 400 })

  const { error } = await supabase.from('groups').update({ name: name.trim() }).eq('id', id)
  if (error) return NextResponse.json({ error: '更新失敗' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
