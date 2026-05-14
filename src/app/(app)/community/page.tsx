import { createClient, getUser } from '@/lib/supabase/server'
import ReflectionFeed from '@/components/community/ReflectionFeed'
import GroupTreeCard from '@/components/tree/GroupTreeCard'
import { todayString } from '@/lib/utils'
import { TREE_CONFIG } from '@/lib/tree'
import Link from 'next/link'
import JoinGroupModal from '@/components/tree/JoinGroupModal'
import type { ReflectionWithProfile, GroupMemberWithProfile, GroupWithMembers } from '@/types/app'

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ scrollTo?: string }> }) {
  const { scrollTo } = await searchParams
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  const monthStart = `${todayString().slice(0, 7)}-01`

  const [{ data: reflections }, { data: myMemberships }, { data: myProfile }] = await Promise.all([
    supabase
      .from('reflections')
      .select('*, profiles(display_name, avatar_seed), reflection_likes(user_id, profiles(avatar_seed))')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('group_members')
      .select('group_id, groups(*, group_members(*, profiles(id, display_name, avatar_seed)))')
      .eq('user_id', user!.id)
      .is('left_at', null),
    supabase
      .from('profiles')
      .select('avatar_seed')
      .eq('id', user!.id)
      .single(),
  ])

  // Build group list with tree_points computed from checkins
  const rawGroups = (myMemberships ?? [])
    .map(m => m.groups)
    .filter(Boolean) as NonNullable<typeof myMemberships>[number]['groups'][]

  // Only active members per group — single batch query instead of N queries
  const allGroupMembers = (rawGroups as NonNullable<typeof rawGroups[number]>[]).map(g =>
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

  const groupsWithPoints: GroupWithMembers[] = (rawGroups as NonNullable<typeof rawGroups[number]>[]).map((g, i) => {
    const activeMemberIds = new Set(allActiveMembers[i].map((m: GroupMemberWithProfile) => m.user_id))
    const treePoints = (allCheckins ?? [])
      .filter(c => activeMemberIds.has(c.user_id))
      .reduce((sum, c) => sum + c.points_earned, 0)
    return { ...(g as unknown as GroupWithMembers), group_members: allGroupMembers[i], tree_points: treePoints }
  })

  const canCreateOrJoin = groupsWithPoints.length < TREE_CONFIG.maxGroups

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">社群</h1>

      {/* My Groups */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500">我的種樹群組</h2>
          {canCreateOrJoin && (
            <div className="flex gap-2">
              <JoinGroupModal />
              <Link href="/community/groups/new"
                className="text-xs font-medium bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 px-3 py-1.5 rounded-full hover:brightness-95 transition-[filter]">
                ＋ 建立
              </Link>
            </div>
          )}
        </div>

        {groupsWithPoints.length > 0 ? (
          <div className="space-y-2">
            {groupsWithPoints.map(g => (
              <GroupTreeCard key={g.id} group={g} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
            <p className="text-gray-500 text-sm">還沒有加入任何群組</p>
            <p className="text-xs text-gray-400">邀請至少一位朋友，一起種一棵樹 🌱</p>
            <div className="flex gap-2 justify-center">
              <JoinGroupModal />
              <Link href="/community/groups/new"
                className="text-sm font-medium bg-gradient-to-br from-[#FFD880] to-[#FFB85A] text-gray-900 px-4 py-2 rounded-xl hover:brightness-95 transition-[filter]">
                建立群組
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Reflection feed */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">最新反思回答</h2>
        <ReflectionFeed
          reflections={(reflections ?? []) as unknown as ReflectionWithProfile[]}
          currentUserId={user?.id ?? null}
          currentUserAvatarSeed={myProfile?.avatar_seed ?? null}
          scrollTo={scrollTo}
        />
      </section>
    </div>
  )
}

