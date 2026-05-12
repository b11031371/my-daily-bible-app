import { notFound, redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { todayString } from '@/lib/utils'
import { TREE_CONFIG, getTreeStage, getFruitCount } from '@/lib/tree'
import GroupTree from '@/components/tree/GroupTree'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import GroupActions from '@/components/tree/GroupActions'
import type { GroupMemberWithProfile } from '@/types/app'

interface Props { params: Promise<{ id: string }> }

const STAGE_LABEL = ['', '種子發芽', '幼苗成長', '小樹茁壯', '大樹展葉', '種植完成'] as const

export default async function GroupDetailPage({ params }: Props) {
  const { id } = await params
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) redirect('/login')

  const monthStart = `${todayString().slice(0, 7)}-01`

  const [{ data: group }, { data: rawMembers }] = await Promise.all([
    supabase.from('groups').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('group_members')
      .select('*, profiles(id, display_name, avatar_seed)')
      .eq('group_id', id),
  ])

  if (!group) notFound()

  const members = (rawMembers ?? []) as unknown as GroupMemberWithProfile[]
  const activeMembers = members.filter(m => m.left_at === null)
  const isMember = activeMembers.some(m => m.user_id === user.id)
  const dormant = activeMembers.length < TREE_CONFIG.minMembers

  // Fetch all this-month checkins from any member (current or past)
  const { data: allCheckins } = await supabase
    .from('checkins')
    .select('user_id, note_date, points_earned')
    .in('user_id', members.map(m => m.user_id))
    .gte('note_date', monthStart)

  // Tree points: sum checkins within each member's active period
  const treePoints = (allCheckins ?? []).reduce((sum, c) => {
    const member = members.find(m => m.user_id === c.user_id)
    if (!member) return sum
    const joinedDate = member.joined_at.split('T')[0]
    const leftDate = member.left_at ? member.left_at.split('T')[0] : null
    if (c.note_date < joinedDate) return sum
    if (leftDate && c.note_date > leftDate) return sum
    return sum + c.points_earned
  }, 0)

  // Per-active-member contribution this month (for display)
  const contribMap = (allCheckins ?? []).reduce<Record<string, number>>((acc, c) => {
    if (activeMembers.some(m => m.user_id === c.user_id)) {
      acc[c.user_id] = (acc[c.user_id] ?? 0) + c.points_earned
    }
    return acc
  }, {})

  const stage = getTreeStage(treePoints)
  const fruitCount = getFruitCount(treePoints)
  const pct = Math.round(Math.min(treePoints / TREE_CONFIG.fullGrowthPoints, 1) * 100)
  const nextFruitPoints = TREE_CONFIG.fruit.start + fruitCount * TREE_CONFIG.fruit.interval

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a href="/community" className="text-gray-400 hover:text-gray-600 text-lg">‹</a>
        <h1 className="text-base font-semibold text-gray-900 flex-1 truncate">{group.name}</h1>
      </div>

      {/* Tree */}
      <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col items-center">
        <GroupTree
          treePoints={treePoints}
          fruitOrder={group.fruit_order}
          className="w-48 h-56"
          interactive
          dormant={dormant}
        />
        <div className="mt-4 text-center">
          <p className="font-bold text-gray-900">{STAGE_LABEL[stage]}</p>
          {stage < 5 ? (
            <div className="mt-2 flex items-center gap-2 w-48">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-14 text-right">{treePoints}/{TREE_CONFIG.fullGrowthPoints}</span>
            </div>
          ) : (
            <p className="text-sm text-accent mt-1">已結出 {fruitCount} / {TREE_CONFIG.fruit.max} 顆果子</p>
          )}
        </div>
        {dormant && (
          <p className="mt-3 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 text-center">
            樹需要至少 2 位成員才能繼續生長
          </p>
        )}
      </div>

      {/* Fruits legend */}
      {fruitCount > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3">已結出的聖靈果子</p>
          <div className="flex flex-wrap gap-2">
            {group.fruit_order.slice(0, fruitCount).map((fruit, i) => (
              <span key={i} className="px-2.5 py-1 bg-accent-light text-accent text-xs font-medium rounded-full">
                {fruit}
              </span>
            ))}
          </div>
          {fruitCount < TREE_CONFIG.fruit.max && (
            <p className="text-[10px] text-gray-400 mt-2">
              再 {nextFruitPoints - treePoints} 分結出下一顆：{group.fruit_order[fruitCount]}
            </p>
          )}
        </div>
      )}

      {/* Members */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 mb-3">
          成員 · {activeMembers.length}/{TREE_CONFIG.maxMembers} 人
        </p>
        <div className="space-y-3">
          {activeMembers.map(m => (
            <div key={m.user_id} className="flex items-center gap-3">
              <BibleAvatar seed={m.profiles.avatar_seed} className="w-8 h-8" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{m.profiles.display_name}</p>
                {m.role === 'admin' && <p className="text-[10px] text-gray-400">建立者</p>}
              </div>
              <span className="text-sm text-gray-700 font-medium">+{contribMap[m.user_id] ?? 0} 分</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invite + Leave actions */}
      <GroupActions
        groupId={id}
        groupName={group.name}
        inviteCode={group.invite_code}
        isMember={isMember}
        canInvite={activeMembers.length < TREE_CONFIG.maxMembers}
        membersWarning={isMember && activeMembers.length <= TREE_CONFIG.minMembers}
      />
    </div>
  )
}
