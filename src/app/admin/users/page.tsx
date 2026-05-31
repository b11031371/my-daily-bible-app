import { createClient } from '@/lib/supabase/server'
import { formatDateZH } from '@/lib/utils'
import BibleAvatar from '@/components/avatar/BibleAvatar'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('total_points', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">使用者管理</h1>
      <div className="space-y-2">
        {(users ?? []).map(u => (
          <div key={u.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
            <BibleAvatar seed={u.avatar_seed ?? 'alpha'} className="w-9 h-9 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 truncate">{u.display_name}</span>
                {u.role === 'admin' && (
                  <span className="text-xs bg-primary text-gray-900 px-1.5 rounded shrink-0">管理員</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">加入 {formatDateZH(u.created_at.split('T')[0])}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-gray-900">{u.total_points} 分</p>
              <p className="text-xs text-gray-400">{u.streak_current} 天</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
