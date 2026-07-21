import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type BadgeUpdate = Database['public']['Tables']['badges']['Update']

/**
 * 白名單：把 request body 收斂成只含可編輯欄位的物件。
 *
 * 逐欄明確指派而非整包展開——展開會讓呼叫端得以寫入任何欄位，且繞過型別檢查。
 * icon 刻意不在清單內：徽章圖示已改由程式碼管理（src/lib/badges/icons.ts），
 * 該欄位為遺留欄位，不應再被寫入。
 */
function pickEditable(body: Record<string, unknown>): BadgeUpdate {
  const u: BadgeUpdate = {}
  if (typeof body.name_zh === 'string') u.name_zh = body.name_zh
  if (typeof body.description_zh === 'string') u.description_zh = body.description_zh
  if (typeof body.condition_value === 'number') u.condition_value = body.condition_value
  if (typeof body.points_bonus === 'number') u.points_bonus = body.points_bonus
  if (typeof body.is_active === 'boolean') u.is_active = body.is_active
  if (
    body.condition_type === 'streak' || body.condition_type === 'total_checkins' ||
    body.condition_type === 'total_points' || body.condition_type === 'reflection_count'
  ) u.condition_type = body.condition_type
  if (body.name_i18n === null || (typeof body.name_i18n === 'object' && body.name_i18n))
    u.name_i18n = body.name_i18n as Record<string, string> | null
  if (body.description_i18n === null || (typeof body.description_i18n === 'object' && body.description_i18n))
    u.description_i18n = body.description_i18n as Record<string, string> | null
  return u
}

export async function GET() {
  // badges 為公開可讀（002 的 badges_select_all），故這裡不另設權限；
  // 後台頁面本身已由 app/admin/layout.tsx 擋掉非管理員。
  const supabase = await createClient()
  const { data, error } = await supabase.from('badges').select('*').order('condition_value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // route handler 不經過 app/admin/layout.tsx，middleware 也把 api/ 排除在 matcher 外，
  // 所以權限得在這裡自己擋（比照 api/admin/reflections/[id]）。
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await req.json()) as Record<string, unknown>
  const id = body.id
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: '缺少徽章 id' }, { status: 400 })
  }

  const updates = pickEditable(body)
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 })
  }

  // 一定要 select()：被 RLS 擋下的 UPDATE 會匹配 0 筆且「不回報錯誤」，
  // 沒有這行就無法區分「更新成功」與「什麼都沒更新」——先前後台顯示
  // 「已儲存」卻其實沒存進去，正是因為少了這個判斷。
  const { data, error } = await supabase
    .from('badges')
    .update(updates)
    .eq('id', id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: '沒有任何資料被更新。請確認徽章 id 存在，且 migration 017 已套用。' },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true })
}
