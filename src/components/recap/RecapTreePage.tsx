'use client'
import { useI18n } from '@/components/i18n/I18nProvider'
import { getTreeStage } from '@/lib/tree'
import GroupTree from '@/components/tree/GroupTree'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import RecapPage from '@/components/recap/RecapPage'
import type { RecapGroup } from '@/lib/recap-groups'

const STAGE_KEY = ['', 'group.stage1', 'group.stage2', 'group.stage3', 'group.stage4', 'group.stage5'] as const

/**
 * 種樹頁：當月我參與長大的那棵樹。
 *
 * 樹畫的是「那個月結束時」的樣子，不是現在的樣子——這正是回顧的意義，
 * 七月它已經更大了，但你看到的是六月的那一棵。
 *
 * dormant 給空樹用：一分未得的月份不該畫一棵正常的小樹，那看起來像剛種下，
 * 而不是「這個月沒動靜」。
 */
export default function RecapTreePage({ group, page }: { group: RecapGroup; page: number }) {
  const { t } = useI18n()
  const stage = getTreeStage(group.treePoints)
  const share = group.treePoints > 0 ? Math.round((group.myPoints / group.treePoints) * 100) : 0

  return (
    <RecapPage page={page} center stagger={false}>
      <div className="space-y-3">
        <div className="recap-reveal" style={{ ['--n' as string]: 0 }}>
          <GroupTree
            treePoints={group.treePoints}
            fruitOrder={group.fruitOrder}
            className="w-40 h-48 mx-auto"
            dormant={group.treePoints === 0}
          />
        </div>

        <div className="recap-reveal" style={{ ['--n' as string]: 1 }}>
          <p className="text-lg font-bold text-gray-900">{group.name}</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {t('recap.treeGrewTo', { stage: t(STAGE_KEY[stage]) })}
          </p>
        </div>

        <div className="recap-reveal" style={{ ['--n' as string]: 2 }}>
          <p className="text-sm text-gray-700">
            {t('recap.treeMyShare', { points: group.myPoints, percent: share })}
          </p>
        </div>

        <div className="recap-reveal space-y-1.5" style={{ ['--n' as string]: 3 }}>
          <p className="text-[11px] tracking-wider text-gray-500">{t('recap.treeTogether')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {group.members.map(m => (
              <span key={m.userId} className="inline-flex items-center gap-1.5">
                <BibleAvatar seed={m.avatarSeed} className="w-6 h-6" />
                <span className="text-xs text-gray-700">{m.displayName}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </RecapPage>
  )
}
