import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// RLS 已經把非擁有者擋在門外（quizzes 的 update/delete policy 綁 owner_id = auth.uid()），
// 所以這裡不用再自己查一次擁有權，改不到就是 0 列受影響。

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch: { title?: string; bible_range?: string | null; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  if (typeof body?.title === 'string') {
    const title = body.title.trim()
    if (!title) return NextResponse.json({ error: '標題不能空白' }, { status: 400 })
    patch.title = title.slice(0, 60)
  }
  if (typeof body?.bible_range === 'string') {
    patch.bible_range = body.bible_range.trim() || null
  }

  const { data, error } = await supabase
    .from('quizzes')
    .update(patch)
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  if (!data) return NextResponse.json({ error: '找不到測驗' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  if (!data) return NextResponse.json({ error: '找不到測驗' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
