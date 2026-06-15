import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import ProfileSettingsForm from '@/components/settings/ProfileSettingsForm'
import FontSizeSwitcher from '@/components/settings/FontSizeSwitcher'

export default async function SettingsPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_seed')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="text-gray-400 hover:text-gray-600 text-lg">‹</Link>
        <h1 className="text-xl font-bold text-gray-900">設定</h1>
      </div>
      <FontSizeSwitcher />
      <ProfileSettingsForm
        userId={user.id}
        initialName={profile?.display_name ?? ''}
        initialSeed={profile?.avatar_seed ?? 'alpha'}
      />
    </div>
  )
}
