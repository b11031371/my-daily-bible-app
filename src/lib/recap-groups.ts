import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { monthRange } from '@/lib/utils'

export interface RecapGroup {
  id: string
  name: string
  fruitOrder: string[]
  /** 全組當月總分，換算成樹的成長階段 */
  treePoints: number
  /** 我在其中貢獻了多少 */
  myPoints: number
  members: { userId: string; displayName: string; avatarSeed: string }[]
}

type SB = SupabaseClient<Database>

/**
 * 當月我參與種樹的群組，以及那個月結束時每棵樹的樣子。
 *
 * 樹的點數沒有存在資料庫，是每次即時算的（同 community/page.tsx）：當月在籍成員的
 * 簽到 + 反思 + 徽章積分加總。這裡沿用同一套算法，差別在「在籍」的定義——
 * 那邊看的是「現在還在不在」（left_at IS NULL），回顧要看的是「那個月在不在」，
 * 否則六月退出的人會從六月的樹上消失。
 */
export async function buildRecapGroups(supabase: SB, userId: string, month: string): Promise<RecapGroup[]> {
  const { dateStart, dateEnd, tsStart, tsEnd } = monthRange(month)

  // 「那個月在籍」= 月底前加入，且（沒退出 或 月初後才退出）
  const activeInMonth = (m: { joined_at: string; left_at: string | null }) =>
    m.joined_at < tsEnd && (m.left_at === null || m.left_at >= tsStart)

  const { data: mine } = await supabase
    .from('group_members')
    .select('group_id, joined_at, left_at')
    .eq('user_id', userId)

  const myGroupIds = (mine ?? []).filter(activeInMonth).map(m => m.group_id)
  if (!myGroupIds.length) return []

  const [{ data: groups }, { data: allMembers }] = await Promise.all([
    supabase.from('groups').select('id, name, fruit_order').in('id', myGroupIds),
    supabase
      .from('group_members')
      .select('group_id, user_id, joined_at, left_at, profiles(display_name, avatar_seed)')
      .in('group_id', myGroupIds),
  ])

  const membersByGroup = new Map<string, typeof allMembers>()
  for (const m of allMembers ?? []) {
    if (!activeInMonth(m)) continue
    const list = membersByGroup.get(m.group_id) ?? []
    list.push(m)
    membersByGroup.set(m.group_id, list)
  }

  const memberIds = [...new Set((allMembers ?? []).filter(activeInMonth).map(m => m.user_id))]
  if (!memberIds.length) return []

  // 每位成員當月的積分。三張表分開查再加總，跟 community 頁同一套來源。
  const [{ data: checkins }, { data: reflections }, { data: badges }] = await Promise.all([
    supabase
      .from('checkins')
      .select('user_id, points_earned')
      .in('user_id', memberIds)
      .gte('note_date', dateStart)
      .lt('note_date', dateEnd),
    supabase
      .from('reflections')
      .select('user_id, points_earned')
      .in('user_id', memberIds)
      .gt('points_earned', 0)
      .gte('note_date', dateStart)
      .lt('note_date', dateEnd),
    // earned_at 是 TIMESTAMPTZ，邊界要用帶 +08:00 的版本
    supabase
      .from('user_badges')
      .select('user_id, badges(points_bonus)')
      .in('user_id', memberIds)
      .gte('earned_at', tsStart)
      .lt('earned_at', tsEnd),
  ])

  const pointsByUser = new Map<string, number>()
  const add = (uid: string, n: number) => pointsByUser.set(uid, (pointsByUser.get(uid) ?? 0) + n)
  for (const c of checkins ?? []) add(c.user_id, c.points_earned)
  for (const r of reflections ?? []) add(r.user_id, r.points_earned)
  for (const ub of badges ?? []) add(ub.user_id, ub.badges?.points_bonus ?? 0)

  return (groups ?? []).map(g => {
    const members = membersByGroup.get(g.id) ?? []
    return {
      id: g.id,
      name: g.name,
      fruitOrder: g.fruit_order,
      treePoints: members.reduce((sum, m) => sum + (pointsByUser.get(m.user_id) ?? 0), 0),
      myPoints: pointsByUser.get(userId) ?? 0,
      members: members.map(m => ({
        userId: m.user_id,
        displayName: m.profiles?.display_name ?? '',
        avatarSeed: m.profiles?.avatar_seed ?? 'alpha',
      })),
    }
  })
}
