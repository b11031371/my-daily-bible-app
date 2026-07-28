import Link from 'next/link'
import TitleDivider from '@/components/layout/TitleDivider'
import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { getServerI18n } from '@/lib/i18n/server'
import ProfileSettingsForm from '@/components/settings/ProfileSettingsForm'
import FontSizeSwitcher from '@/components/settings/FontSizeSwitcher'
import LanguageSwitcher from '@/components/settings/LanguageSwitcher'
import ThemeSwitcher from '@/components/settings/ThemeSwitcher'

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
        <Link href="/profile" className="text-gray-400 hover:text-gray-600 active:opacity-50 text-lg">‹</Link>
        <h1 className="page-title font-bold text-heading">{t('settings.title')}</h1>
      </div>
      <TitleDivider />
      <LanguageSwitcher />
      <ThemeSwitcher />
      <FontSizeSwitcher />
      <ProfileSettingsForm
        userId={user.id}
        initialName={profile?.display_name ?? ''}
        initialSeed={profile?.avatar_seed ?? 'alpha'}
      />

      {/* 徽章圖示的出處標示。Twemoji 為 CC-BY 4.0，授權要求標註原始創作者；
          該專案明示設定頁是行動 app 可接受的標註位置。 */}
      <p className="pt-2 text-center text-[11px] leading-relaxed text-gray-400">
        {t('settings.creditsBadges')}
        {' · '}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-gray-600 active:opacity-50 transition-colors"
        >
          {t('settings.creditsLicense')}
        </a>
      </p>
    </div>
  )
}
