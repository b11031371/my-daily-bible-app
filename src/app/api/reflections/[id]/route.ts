import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('reflections')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, is_anonymous } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Missing content' }, { status: 400 })

  // UPDATE policy (auth.uid() = user_id) exists — regular client is fine
  const { error } = await supabase
    .from('reflections')
    .update({ content: content.trim(), is_anonymous: is_anonymous ?? false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
