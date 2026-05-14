import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Params = { params: Promise<{ id: string }> }

function serviceClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership with user client (SELECT policy exists)
  const { data: reflection } = await supabase
    .from('reflections').select('user_id').eq('id', id).single()

  if (!reflection) return NextResponse.json({ error: '留言不存在' }, { status: 404 })
  if (reflection.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // No DELETE RLS policy — use service role after ownership is confirmed above
  const { error } = await serviceClient().from('reflections').delete().eq('id', id)
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
