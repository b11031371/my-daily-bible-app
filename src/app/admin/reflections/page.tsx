import { createClient } from '@/lib/supabase/server'
import { formatDateZH } from '@/lib/utils'
import DeleteReflectionButton from './DeleteReflectionButton'

export default async function AdminReflectionsPage() {
  const supabase = await createClient()
  const { data: reflections } = await supabase
    .from('reflections')
    .select('id, note_date, content, is_anonymous, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">反思留言管理</h1>
        <span className="text-sm text-gray-400">最近 {reflections?.length ?? 0} 則</span>
      </div>
      <div className="space-y-2">
        {(reflections ?? []).map((r: any) => (
          <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 text-xs text-gray-400 mb-1">
                <span className="font-medium text-gray-600">
                  {r.is_anonymous ? '匿名' : (r.profiles?.display_name ?? '—')}
                </span>
                <span>·</span>
                <span>{formatDateZH(r.note_date)}</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{r.content}</p>
            </div>
            <DeleteReflectionButton id={r.id} />
          </div>
        ))}
        {!reflections?.length && (
          <p className="text-sm text-gray-400 text-center py-8">目前沒有留言</p>
        )}
      </div>
    </div>
  )
}
