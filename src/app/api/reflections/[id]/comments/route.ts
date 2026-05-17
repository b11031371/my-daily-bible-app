import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: '內容不能為空' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('reflection_comments')
    .insert({ reflection_id: id, user_id: user.id, content: content.trim() })
    .select('id, reflection_id, user_id, content, created_at, profiles(display_name, avatar_seed)')
    .single()

  if (error) return NextResponse.json({ error: '新增失敗' }, { status: 500 })
  return NextResponse.json(data)
}
