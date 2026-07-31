import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import BottomNav from '@/components/layout/BottomNav'
import { BadgeToastProvider } from '@/components/layout/BadgeToast'
import { RecapProvider } from '@/components/recap/RecapProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <BadgeToastProvider>
      <RecapProvider>
        {/* dvh 而非 vh：Tailwind 的 min-h-screen 是 100vh，在 iOS Safari 等於
            「網址列收起時」的高度，比實際可見範圍高一截，於是每頁底部都多出一段
            空白可以捲。dvh 貼合當下可見高度，該捲才捲。 */}
        <div className="min-h-dvh flex flex-col">
          <main className="flex-1 pb-20">
            {children}
          </main>
          <BottomNav />
        </div>
      </RecapProvider>
    </BadgeToastProvider>
  )
}
