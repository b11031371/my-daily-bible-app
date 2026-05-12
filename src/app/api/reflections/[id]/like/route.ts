import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('reflection_likes')
    .insert({ reflection_id: id, user_id: user.id })

  if (error && error.code !== '23505')
    return NextResponse.json({ error: '點讚失敗' }, { status: 400 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('reflection_likes')
    .delete()
    .eq('reflection_id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
