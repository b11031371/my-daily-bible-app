import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomFruitOrder, generateInviteCode, TREE_CONFIG } from '@/lib/tree'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()

  // Check user's current group count (max 3)
  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('left_at', null)

  if ((count ?? 0) >= TREE_CONFIG.maxGroups) {
    return NextResponse.json({ error: `最多同時加入 ${TREE_CONFIG.maxGroups} 個群組` }, { status: 400 })
  }

  // Generate unique invite code (retry if collision)
  let invite_code = generateInviteCode()
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase.from('groups').select('id').eq('invite_code', invite_code).maybeSingle()
    if (!existing) break
    invite_code = generateInviteCode()
  }

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name: name?.trim() || '我們的樹', invite_code, fruit_order: randomFruitOrder(), created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: '建立失敗' }, { status: 500 })

  // Join as admin
  await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin' })

  return NextResponse.json({ id: group.id })
}
