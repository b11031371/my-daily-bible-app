import { createClient, getUser } from '@/lib/supabase/server'
import CommunityTabs from '@/components/community/CommunityTabs'
import { todayString } from '@/lib/utils'
import { TREE_CONFIG } from '@/lib/tree'
import type { ReflectionWithProfile, GroupMemberWithProfile, GroupWithMembers } from '@/types/app'

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ scrollTo?: string }> }) {
  const { scrollTo } = await searchParams
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  const monthStart = `${todayString().slice(0, 7)}-01`

  const [{ data: reflections }, { data: allGroupsRaw }, { data: myMemberships }, { data: myProfile }] = await Promise.all([
    supabase
      .from('reflections')
      .select('*, profiles(display_name, avatar_seed), reflection_likes(user_id, profiles(avatar_seed))')
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
      .select('avatar_seed')
      .eq('id', user!.id)
      .single(),
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

  const { data: allCheckins } = allActiveMemberIds.length > 0
    ? await supabase
        .from('checkins')
        .select('user_id, points_earned')
        .in('user_id', allActiveMemberIds)
        .gte('note_date', monthStart)
    : { data: [] }

  const groupsWithPoints: GroupWithMembers[] = rawGroups.map((g, i) => {
    const activeMemberIds = new Set(allActiveMembers[i].map((m: GroupMemberWithProfile) => m.user_id))
    const treePoints = (allCheckins ?? [])
      .filter(c => activeMemberIds.has(c.user_id))
      .reduce((sum, c) => sum + c.points_earned, 0)
    return { ...(g as unknown as GroupWithMembers), group_members: allGroupMembers[i], tree_points: treePoints }
  })

  const activeGroupsWithPoints = groupsWithPoints.filter(g =>
    (g.group_members as GroupMemberWithProfile[]).some(m => m.left_at === null)
  )
  activeGroupsWithPoints.sort((a, b) => b.tree_points - a.tree_points)

  const myGroups = activeGroupsWithPoints.filter(g => myGroupIds.has(g.id))
  const otherGroups = activeGroupsWithPoints.filter(g => !myGroupIds.has(g.id))

  const canCreateOrJoin = myGroups.length < TREE_CONFIG.maxGroups

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">社群</h1>

      <CommunityTabs
        myGroups={myGroups}
        otherGroups={otherGroups}
        canCreateOrJoin={canCreateOrJoin}
        reflections={(reflections ?? []) as unknown as ReflectionWithProfile[]}
        currentUserId={user?.id ?? null}
        currentUserAvatarSeed={myProfile?.avatar_seed ?? null}
        scrollTo={scrollTo}
      />
    </div>
  )
}

