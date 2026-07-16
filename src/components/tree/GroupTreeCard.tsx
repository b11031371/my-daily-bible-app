'use client'
import Link from 'next/link'
import GroupTree from './GroupTree'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import { TREE_CONFIG, getTreeStage, getFruitCount } from '@/lib/tree'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { GroupWithMembers } from '@/types/app'

interface Props {
  group: GroupWithMembers
}

const STAGE_KEY = ['', 'group.stage1', 'group.stage2', 'group.stage3', 'group.stage4', 'group.stage5'] as const

export default function GroupTreeCard({ group }: Props) {
  const { t } = useI18n()
  const { id, name, tree_points, fruit_order, group_members } = group
  const activeMembers = group_members.filter(m => m.left_at === null)
  const dormant = activeMembers.length < TREE_CONFIG.minMembers
  const stage = getTreeStage(tree_points)
  const pct = Math.round(Math.min(tree_points / TREE_CONFIG.fullGrowthPoints, 1) * 100)
  const fruitCount = getFruitCount(tree_points)

  return (
    <Link href={`/community/groups/${id}`} className="block bg-white rounded-2xl shadow-sm overflow-hidden active:opacity-90 transition-opacity">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Mini tree */}
        <div className="relative w-16 h-16 shrink-0 flex items-end justify-center">
          <GroupTree
            treePoints={tree_points}
            fruitOrder={fruit_order}
            className="w-full h-full"
            dormant={dormant}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{stage > 0 ? t(STAGE_KEY[stage]) : ''}</p>

          {/* Progress bar */}
          {stage < 5 ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400">{pct}%</span>
            </div>
          ) : (
            <p className="text-[10px] text-accent mt-1">{t('group.fruitProgress', { interval: TREE_CONFIG.fruit.interval, count: fruitCount, max: TREE_CONFIG.fruit.max })}</p>
          )}
        </div>

        {/* Member avatars */}
        <div className="flex -space-x-2 shrink-0">
          {activeMembers.slice(0, 3).map(m => (
            <BibleAvatar key={m.user_id} seed={m.profiles.avatar_seed} className="w-7 h-7 border-2 border-white" />
          ))}
          {activeMembers.length > 3 && (
            <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] text-gray-500 font-medium">
              +{activeMembers.length - 3}
            </div>
          )}
        </div>
      </div>

      {dormant && (
        <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">{t('group.dormantHint')}</p>
        </div>
      )}
    </Link>
  )
}
