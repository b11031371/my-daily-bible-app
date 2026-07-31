import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncNoteMeta } from '@/lib/note-meta'

/**
 * 手動觸發經文範圍同步，給後台回填歷史筆記用。
 *
 * 一次只處理一批，呼叫端看 remaining 決定要不要再打（見 SyncNoteMetaButton）。
 * 這裡沒有 RPC 可以靠 RLS 擋人，所以自己查 role。
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const result = await syncNoteMeta()
  return NextResponse.json(result)
}
