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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-3">暱稱</th>
              <th className="text-right px-4 py-3">積分</th>
              <th className="text-right px-4 py-3">連續</th>
              <th className="text-right px-4 py-3">加入日期</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map(u => (
              <tr key={u.id} className="border-t border-gray-50">
                <td className="px-4 py-3 flex items-center gap-2">
                  <BibleAvatar seed={u.avatar_seed ?? 'alpha'} className="w-7 h-7" />
                  <span className="font-medium">{u.display_name}</span>
                  {u.role === 'admin' && (
                    <span className="text-xs bg-primary text-gray-900 px-1.5 rounded">管理員</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{u.total_points}</td>
                <td className="px-4 py-3 text-right text-gray-500">{u.streak_current} 天</td>
                <td className="px-4 py-3 text-right text-gray-400">
                  {formatDateZH(u.created_at.split('T')[0])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
