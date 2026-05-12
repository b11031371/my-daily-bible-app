import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TREE_CONFIG } from '@/lib/tree'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await req.json()
  if (!invite_code) return NextResponse.json({ error: '請輸入邀請碼' }, { status: 400 })

  // Find group
  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', invite_code.trim().toUpperCase())
    .maybeSingle()

  if (!group) return NextResponse.json({ error: '找不到此邀請碼' }, { status: 404 })

  // Check group member count (max 5)
  const { count: memberCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id)
    .is('left_at', null)

  if ((memberCount ?? 0) >= TREE_CONFIG.maxMembers) {
    return NextResponse.json({ error: '此群組已滿員（最多 5 人）' }, { status: 400 })
  }

  // Check user's current group count (max 3)
  const { count: myCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('left_at', null)

  if ((myCount ?? 0) >= TREE_CONFIG.maxGroups) {
    return NextResponse.json({ error: `最多同時加入 ${TREE_CONFIG.maxGroups} 個群組` }, { status: 400 })
  }

  // Upsert: if previously left, rejoin by clearing left_at
  const { data: existing } = await supabase
    .from('group_members')
    .select('id, left_at')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.left_at === null) return NextResponse.json({ error: '你已經在此群組中' }, { status: 400 })
    await supabase.from('group_members').update({ left_at: null }).eq('id', existing.id)
  } else {
    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id })
  }

  return NextResponse.json({ id: group.id })
}
