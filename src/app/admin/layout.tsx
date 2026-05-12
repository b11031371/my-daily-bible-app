import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/notes')

  const links = [
    { href: '/admin', label: '首頁' },
    { href: '/admin/users', label: '使用者' },
    { href: '/admin/checkins', label: '補簽' },
    { href: '/admin/badges', label: '徽章' },
    { href: '/admin/leaderboard', label: '排行榜' },
    { href: '/admin/reflections', label: '留言' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1a1a1a] text-white px-4 py-3 flex gap-4 items-center text-sm overflow-x-auto">
        <span className="font-bold shrink-0">管理後台</span>
        {links.map(l => (
          <Link key={l.href} href={l.href} className="text-gray-300 hover:text-white shrink-0 transition-colors">
            {l.label}
          </Link>
        ))}
        <Link href="/notes" className="ml-auto text-gray-400 hover:text-white shrink-0">← 回網站</Link>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
