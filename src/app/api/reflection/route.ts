import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { note_date, content, is_anonymous, bible_range } = await req.json()
  if (!note_date || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase.rpc('fn_submit_reflection', {
    p_note_date: note_date,
    p_content: content,
    p_anonymous: is_anonymous ?? false,
    p_bible_range: bible_range ?? null,
  })
  if (error) return NextResponse.json({ error: '提交失敗' }, { status: 400 })

  return NextResponse.json(data)
}
