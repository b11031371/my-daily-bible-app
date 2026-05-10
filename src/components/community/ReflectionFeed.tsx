import { formatDateZH } from '@/lib/utils'
import type { ReflectionWithProfile } from '@/types/app'
import BibleAvatar from '@/components/avatar/BibleAvatar'

export default function ReflectionFeed({ reflections }: { reflections: ReflectionWithProfile[] }) {
  if (reflections.length === 0) {
    return <div className="text-center py-10 text-sm text-gray-400">還沒有人分享，來做第一個吧！</div>
  }
  return (
    <div className="space-y-3">
      {reflections.map(r => {
        const name = r.is_anonymous ? '匿名' : r.profiles?.display_name ?? '使用者'
        const seed = r.is_anonymous ? 'anon' : (r.profiles?.avatar_seed ?? r.user_id)
        return (
          <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BibleAvatar seed={seed} className="w-7 h-7" />
              <span className="text-sm font-medium text-gray-900">{name}</span>
              <span className="text-xs text-gray-400 ml-auto">{formatDateZH(r.note_date)}</span>
            </div>
            <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">{r.content}</p>
          </div>
        )
      })}
    </div>
  )
}
