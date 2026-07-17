import { createClient, getUser } from '@/lib/supabase/server'
import TitleDivider from '@/components/layout/TitleDivider'
import { getServerI18n } from '@/lib/i18n/server'
import { noteLangFor } from '@/lib/i18n'
import CommunityTabs from '@/components/community/CommunityTabs'
import CommunityInfoButton from '@/components/community/CommunityInfoButton'
import { todayString } from '@/lib/utils'
import { TREE_CONFIG } from '@/lib/tree'
import { fetchPassageRange } from '@/lib/github/api'
import type { ReflectionWithProfile, GroupMemberWithProfile, GroupWithMembers } from '@/types/app'

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ scrollTo?: string; tab?: string }> }) {
  const { scrollTo, tab } = await searchParams
  const initialTab = tab === 'groups' ? 'groups' : 'feed'
  const [user, supabase, { t, locale }] = await Promise.all([getUser(), createClient(), getServerI18n()])
  const today = todayString()
  const monthStart = `${today.slice(0, 7)}-01`
  const [y, m] = today.slice(0, 7).split('-').map(Number)
  const monthEnd = new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: reflections }, { data: allGroupsRaw }, { data: myMemberships }, { data: myProfile }, todayBibleRange] = await Promise.all([
    supabase
      .from('reflections')
      .select('*, profiles(display_name, avatar_seed), reflection_likes(user_id, profiles(avatar_seed)), reflection_comments(id, user_id, content, created_at, profiles(display_name, avatar_seed))')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('groups')
      .select('*, group_members(*, profiles(id, display_name, avatar_seed))'),
    supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user!.id)
      .is('left_at', null),
    supabase
      .from('profiles')
      .select('avatar_seed, role')
      .eq('id', user!.id)
      .single(),
    fetchPassageRange(today, noteLangFor(locale)),
  ])

  const myGroupIds = new Set((myMemberships ?? []).map(m => m.group_id))

  // Compute tree points for all groups in one batch
  const rawGroups = (allGroupsRaw ?? []) as unknown as GroupWithMembers[]
  const allGroupMembers = rawGroups.map(g =>
    (g as unknown as { group_members: GroupMemberWithProfile[] }).group_members ?? []
  )
  const allActiveMembers = allGroupMembers.map(members =>
    members.filter((m: GroupMemberWithProfile) => m.left_at === null)
  )
  const allActiveMemberIds = [...new Set(allActiveMembers.flat().map((m: GroupMemberWithProfile) => m.user_id))]

  const [{ data: allCheckins }, { data: allReflections }, { data: allBadges }] = allActiveMemberIds.length > 0
    ? await Promise.all([
        supabase.from('checkins').select('user_id, points_earned').in('user_id', allActiveMemberIds).gte('note_date', monthStart).lt('note_date', monthEnd),
        sb.from('reflections').select('user_id, points_earned').in('user_id', allActiveMemberIds).gt('points_earned', 0).gte('note_date', monthStart).lt('note_date', monthEnd),
        sb.from('user_badges').select('user_id, badges(points_bonus)').in('user_id', allActiveMemberIds).gte('earned_at', monthStart).lt('earned_at', monthEnd),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const memberPointsMap: Record<string, number> = {}
  for (const c of (allCheckins ?? [])) memberPointsMap[c.user_id] = (memberPointsMap[c.user_id] ?? 0) + c.points_earned
  for (const r of (allReflections ?? [])) memberPointsMap[r.user_id] = (memberPointsMap[r.user_id] ?? 0) + r.points_earned
  for (const ub of (allBadges ?? [])) {
    const bonus = (ub as { user_id: string; badges: { points_bonus: number } | null }).badges?.points_bonus ?? 0
    if (bonus > 0) memberPointsMap[(ub as { user_id: string }).user_id] = (memberPointsMap[(ub as { user_id: string }).user_id] ?? 0) + bonus
  }

  const groupsWithPoints: GroupWithMembers[] = rawGroups.map((g, i) => {
    const activeMemberIds = new Set(allActiveMembers[i].map((m: GroupMemberWithProfile) => m.user_id))
    const treePoints = [...activeMemberIds].reduce((sum, uid) => sum + (memberPointsMap[uid] ?? 0), 0)
    return { ...(g as unknown as GroupWithMembers), group_members: allGroupMembers[i], tree_points: treePoints }
  })

  const activeGroupsWithPoints = groupsWithPoints.filter(g =>
    (g.group_members as GroupMemberWithProfile[]).some(m => m.left_at === null)
  )
  activeGroupsWithPoints.sort((a, b) => b.tree_points - a.tree_points)

  const myGroups = activeGroupsWithPoints.filter(g => myGroupIds.has(g.id))
  const otherGroups = activeGroupsWithPoints.filter(g => !myGroupIds.has(g.id))

  const canCreateOrJoin = myGroups.length < TREE_CONFIG.maxGroups

  const currentUserIsAdmin = myProfile?.role === 'admin'

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="page-title font-bold text-heading">{t('nav.community')}</h1>
        <CommunityInfoButton />
      </div>
      <TitleDivider />

      <CommunityTabs
        myGroups={myGroups}
        otherGroups={otherGroups}
        canCreateOrJoin={canCreateOrJoin}
        reflections={(reflections ?? []) as unknown as ReflectionWithProfile[]}
        currentUserId={user?.id ?? null}
        currentUserAvatarSeed={myProfile?.avatar_seed ?? null}
        currentUserIsAdmin={currentUserIsAdmin}
        scrollTo={scrollTo}
        initialTab={initialTab}
        todayBibleRange={todayBibleRange ?? null}
      />
    </div>
  )
}

