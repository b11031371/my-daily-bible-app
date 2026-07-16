import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { getServerI18n } from '@/lib/i18n/server'
import ProfileSettingsForm from '@/components/settings/ProfileSettingsForm'
import FontSizeSwitcher from '@/components/settings/FontSizeSwitcher'
import LanguageSwitcher from '@/components/settings/LanguageSwitcher'

export default async function SettingsPage() {
  const [user, supabase, { t }] = await Promise.all([getUser(), createClient(), getServerI18n()])
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
        <h1 className="text-xl font-bold text-gray-900">{t('settings.title')}</h1>
      </div>
      <LanguageSwitcher />
      <FontSizeSwitcher />
      <ProfileSettingsForm
        userId={user.id}
        initialName={profile?.display_name ?? ''}
        initialSeed={profile?.avatar_seed ?? 'alpha'}
      />
    </div>
  )
}
