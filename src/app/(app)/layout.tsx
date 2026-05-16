import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import BottomNav from '@/components/layout/BottomNav'
import { BadgeToastProvider } from '@/components/layout/BadgeToast'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <BadgeToastProvider>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 pb-20">
          {children}
        </main>
        <BottomNav />
      </div>
    </BadgeToastProvider>
  )
}
