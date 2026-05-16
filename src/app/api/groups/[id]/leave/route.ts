import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('group_members')
    .update({ left_at: new Date().toISOString() })
    .eq('group_id', id)
    .eq('user_id', user.id)
    .is('left_at', null)

  if (error) return NextResponse.json({ error: '退出失敗' }, { status: 500 })

  // Check if any active members remain
  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', id)
    .is('left_at', null)

  if (count === 0) {
    const adminClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error: deleteError } = await adminClient.from('groups').delete().eq('id', id)
    if (deleteError) return NextResponse.json({ error: '群組刪除失敗' }, { status: 500 })
    return NextResponse.json({ ok: true, groupDeleted: true })
  }

  return NextResponse.json({ ok: true, groupDeleted: false })
}
