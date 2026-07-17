import { notFound, redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { getServerI18n } from '@/lib/i18n/server'
import { formatMonth } from '@/lib/utils'
import { todayString } from '@/lib/utils'
import { TREE_CONFIG, getTreeStage, getFruitCount, FRUIT_I18N, type FruitKey } from '@/lib/tree'
import GroupTree from '@/components/tree/GroupTree'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import GroupActions from '@/components/tree/GroupActions'
import GroupJoinForm from '@/components/tree/GroupJoinForm'
import type { GroupMemberWithProfile } from '@/types/app'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}

const STAGE_KEY = ['', 'group.stage1', 'group.stage2', 'group.stage3', 'group.stage4', 'group.stage5'] as const

export default async function GroupDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { month } = await searchParams
  const [user, supabase, { locale, t }] = await Promise.all([getUser(), createClient(), getServerI18n()])
  if (!user) redirect('/login')
  const fruitName = (key: string) => FRUIT_I18N[locale][key as FruitKey]?.name ?? key

  const today = todayString()
  const currentYM = today.slice(0, 7)
  const selectedYM = (month && /^\d{4}-\d{2}$/.test(month) && month <= currentYM)
    ? month
    : currentYM
  const isCurrentMonth = selectedYM === currentYM

  const [sy, sm] = selectedYM.split('-').map(Number)
  const monthStart = `${selectedYM}-01`
  const monthEnd = new Date(Date.UTC(sy, sm, 1)).toISOString().split('T')[0]

  const prevYM = new Date(Date.UTC(sy, sm - 2, 1)).toISOString().slice(0, 7)
  const nextYM = new Date(Date.UTC(sy, sm, 1)).toISOString().slice(0, 7)

  const monthLabel = formatMonth(selectedYM, locale)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: group }, { data: rawMembers }, { count: myGroupCount }] = await Promise.all([
    supabase.from('groups').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('group_members')
      .select('*, profiles(id, display_name, avatar_seed)')
      .eq('group_id', id),
    supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('left_at', null),
  ])

  if (!group) notFound()

  const groupCreatedYM = group.created_at.slice(0, 7)
  const isFirstMonth = prevYM < groupCreatedYM

  const members = (rawMembers ?? []) as unknown as GroupMemberWithProfile[]
  const activeMembers = members.filter(m => m.left_at === null)
  const isMember = activeMembers.some(m => m.user_id === user.id)
  const dormant = activeMembers.length < TREE_CONFIG.minMembers

  const activeMemberIds = activeMembers.map(m => m.user_id)

  const [{ data: allCheckins }, { data: allReflections }, { data: allBadges }] = activeMemberIds.length > 0
    ? await Promise.all([
        supabase.from('checkins').select('user_id, points_earned').in('user_id', activeMemberIds).gte('note_date', monthStart).lt('note_date', monthEnd),
        sb.from('reflections').select('user_id, points_earned').in('user_id', activeMemberIds).gt('points_earned', 0).gte('note_date', monthStart).lt('note_date', monthEnd),
        sb.from('user_badges').select('user_id, badges(points_bonus)').in('user_id', activeMemberIds).gte('earned_at', monthStart).lt('earned_at', monthEnd),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const contribMap: Record<string, number> = {}
  for (const c of (allCheckins ?? [])) contribMap[c.user_id] = (contribMap[c.user_id] ?? 0) + c.points_earned
  for (const r of (allReflections ?? [])) contribMap[r.user_id] = (contribMap[r.user_id] ?? 0) + r.points_earned
  for (const ub of (allBadges ?? [])) {
    const bonus = (ub as { user_id: string; badges: { points_bonus: number } | null }).badges?.points_bonus ?? 0
    if (bonus > 0) contribMap[(ub as { user_id: string }).user_id] = (contribMap[(ub as { user_id: string }).user_id] ?? 0) + bonus
  }

  const treePoints = Object.values(contribMap).reduce((sum, v) => sum + v, 0)

  const stage = getTreeStage(treePoints)
  const fruitCount = getFruitCount(treePoints)
  const pct = Math.round(Math.min(treePoints / TREE_CONFIG.fullGrowthPoints, 1) * 100)
  const nextFruitPoints = TREE_CONFIG.fruit.start + fruitCount * TREE_CONFIG.fruit.interval

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a href="/community?tab=groups" className="text-gray-400 hover:text-gray-600 text-lg">‹</a>
        <h1 className="text-base font-semibold text-gray-900 flex-1 truncate">{group.name}</h1>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4">
        {isFirstMonth ? (
          <span className="text-gray-200 px-2 py-1 cursor-default">←</span>
        ) : (
          <a
            href={`/community/groups/${id}?month=${prevYM}`}
            className="text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            ←
          </a>
        )}
        <span className="text-sm font-medium text-gray-700 w-24 text-center">{monthLabel}</span>
        {isCurrentMonth ? (
          <span className="text-gray-200 px-2 py-1 cursor-default">→</span>
        ) : (
          <a
            href={nextYM <= currentYM ? `/community/groups/${id}?month=${nextYM}` : `/community/groups/${id}`}
            className="text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            →
          </a>
        )}
      </div>

      {/* Tree */}
      <div className="bg-surface rounded-3xl shadow-sm p-6 flex flex-col items-center">
        {!isCurrentMonth && (
          <p className="text-xs text-gray-400 mb-4">{t('group.historyRecord', { month: monthLabel })}</p>
        )}
        <GroupTree
          treePoints={treePoints}
          fruitOrder={group.fruit_order}
          className="w-48 h-56"
          interactive
          dormant={dormant}
        />
        <div className="mt-4 text-center">
          <p className="font-bold text-gray-900">{stage > 0 ? t(STAGE_KEY[stage]) : ''}</p>
          {stage < 5 ? (
            <div className="mt-2 flex items-center gap-2 w-48">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-14 text-right">{treePoints}/{TREE_CONFIG.fullGrowthPoints}</span>
            </div>
          ) : (
            <p className="text-sm text-accent mt-1">{t('group.fruitsGrown', { count: fruitCount, max: TREE_CONFIG.fruit.max })}</p>
          )}
        </div>
        {dormant && isCurrentMonth && (
          <p className="mt-3 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 text-center">
            {t('group.dormantHintDetail')}
          </p>
        )}
      </div>

      {/* Fruits legend */}
      {fruitCount > 0 && (
        <div className="bg-surface rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3">{t('group.grownFruits')}</p>
          <div className="flex flex-wrap gap-2">
            {group.fruit_order.slice(0, fruitCount).map((fruit, i) => (
              <span key={i} className="px-2.5 py-1 bg-accent-light text-accent text-xs font-medium rounded-full">
                {fruitName(fruit)}
              </span>
            ))}
          </div>
          {fruitCount < TREE_CONFIG.fruit.max && (
            <p className="text-[10px] text-gray-400 mt-2">
              {t('group.nextFruit', { points: nextFruitPoints - treePoints, fruit: fruitName(group.fruit_order[fruitCount]) })}
            </p>
          )}
        </div>
      )}

      {/* Members */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 mb-3">
          {t('group.membersCount', { count: activeMembers.length, max: TREE_CONFIG.maxMembers })}
        </p>
        <div className="space-y-3">
          {activeMembers.map(m => (
            <div key={m.user_id} className="flex items-center gap-3">
              <BibleAvatar seed={m.profiles.avatar_seed} className="w-8 h-8" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{m.profiles.display_name}</p>
                {m.role === 'admin' && <p className="text-[10px] text-gray-400">{t('group.creator')}</p>}
              </div>
              <span className="text-sm text-gray-700 font-medium">{t('group.contribPoints', { points: contribMap[m.user_id] ?? 0 })}</span>
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
        isLastMember={isMember && activeMembers.length === 1}
      />

      {!isMember && (
        <GroupJoinForm canJoin={(myGroupCount ?? 0) < TREE_CONFIG.maxGroups} />
      )}
    </div>
  )
}
