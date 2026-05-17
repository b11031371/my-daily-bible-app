import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: '內容不能為空' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: comment } = await sb
    .from('reflection_comments')
    .select('user_id')
    .eq('id', commentId)
    .maybeSingle()

  if (!comment) return NextResponse.json({ error: '找不到此留言' }, { status: 404 })
  if (comment.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await sb
    .from('reflection_comments')
    .update({ content: content.trim() })
    .eq('id', commentId)

  if (error) return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: comment } = await sb
    .from('reflection_comments')
    .select('user_id')
    .eq('id', commentId)
    .maybeSingle()

  if (!comment) return NextResponse.json({ error: '找不到此留言' }, { status: 404 })

  if (comment.user_id === user.id) {
    const { error } = await sb.from('reflection_comments').delete().eq('id', commentId)
    if (error) return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Check admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from('reflection_comments').delete().eq('id', commentId)
  if (error) return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
