import Link from 'next/link'
import TitleDivider from '@/components/layout/TitleDivider'
import { fetchAvailableDates, fetchPassageRange } from '@/lib/github/api'
import { formatDate, todayString, getLastSevenDays } from '@/lib/utils'
import { createClient, getUser } from '@/lib/supabase/server'
import { getServerI18n } from '@/lib/i18n/server'
import { noteLangFor } from '@/lib/i18n'
import QuickCheckinButton from '@/components/notes/QuickCheckinButton'
import { Fire, Users, ChatCircle, Medal, Check } from '@phosphor-icons/react/dist/ssr'
import BibleAvatar from '@/components/avatar/BibleAvatar'
import type { Profile } from '@/types/app'

export default async function NotesPage() {
  const today = todayString()
  const weekDates = getLastSevenDays()

  // Resolve locale first so the passage range is fetched in the right language
  const { locale, t } = await getServerI18n()

  // Fire GitHub fetches immediately — run concurrently with auth + Supabase
  const passageRangePromise = fetchPassageRange(today, noteLangFor(locale))
  const availableDatesPromise = fetchAvailableDates()

  const [user, supabase] = await Promise.all([getUser(), createClient()])

  const [
    { data: todayCheckins, count: checkinCount },
    { count: reflectionCount },
    { data: allBadges },
    { data: userBadges },
    { data: weekCheckins },
    { data: profile },
    { data: approvalSetting },
    { data: approvedDatesRaw },
  ] = await Promise.all([
    supabase
      .from('checkins')
      .select('user_id', { count: 'exact' })
      .eq('note_date', today)
      .order('checked_in_at', { ascending: false }),
    supabase
      .from('reflections')
      .select('*', { count: 'exact', head: true })
      .eq('note_date', today),
    supabase.from('badges').select('id').eq('is_active', true),
    supabase.from('user_badges').select('badge_id').eq('user_id', user!.id),
    supabase.from('checkins').select('note_date, is_retro').eq('user_id', user!.id).in('note_date', weekDates),
    supabase.from('profiles').select('streak_current, role').eq('id', user!.id).single(),
    (supabase as any).from('app_settings').select('value').eq('key', 'approval_mode').single(),
    (supabase as any).from('note_approvals').select('date'),
  ])

  const approvalMode = approvalSetting?.value === 'true'
  const isAdmin = profile?.role === 'admin'
  const approvedDates = new Set((approvedDatesRaw ?? []).map((r: { date: string }) => r.date))

  const communityUserIds = (todayCheckins ?? []).slice(0, 4).map(c => c.user_id)

  // Run communityProfiles in parallel with GitHub resolution — avoids a 3rd serial wave
  const [passageRange, availableDates, { data: communityProfiles }] = await Promise.all([
    passageRangePromise,
    availableDatesPromise,
    communityUserIds.length > 0
      ? supabase.from('profiles').select('id, display_name, avatar_seed').in('id', communityUserIds)
      : Promise.resolve({ data: [] as Pick<Profile, 'id' | 'display_name' | 'avatar_seed'>[] }),
  ])

  // Re-sort profiles to match checkin time order (newest first)
  const profileMap = new Map((communityProfiles ?? []).map(p => [p.id, p]))
  const orderedProfiles = communityUserIds.map(id => profileMap.get(id)).filter((p): p is NonNullable<typeof p> => !!p)

  const userCheckedIn = (todayCheckins ?? []).some(c => c.user_id === user!.id)
  const unearnedBadges = (allBadges?.length ?? 0) - (userBadges?.length ?? 0)
  const checkedDates = new Set((weekCheckins ?? []).map(c => c.note_date))
  const retroDates = new Set((weekCheckins ?? []).filter(c => c.is_retro).map(c => c.note_date))
  const todayApproved = approvedDates.has(today)
  const showHeroCard = passageRange && (!approvalMode || isAdmin || todayApproved)
  const allPastDates = availableDates.filter(d => d !== today)
  const pastDates = (approvalMode && !isAdmin)
    ? allPastDates.filter(d => approvedDates.has(d)).slice(0, 2)
    : allPastDates.slice(0, 2)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-2 space-y-4">
      <h1 className="page-title font-bold text-heading">{t('notesList.title')}</h1>
      <TitleDivider />

      {/* Hero card */}
      {showHeroCard ? (
        <Link href={`/notes/${today}`} className="block active:opacity-90 transition-opacity">
          <div className="animated-border rounded-3xl shadow-lg">
            <div className="btn-gradient rounded-[22px] p-6 text-gray-900">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs bg-black/10 px-2.5 py-1 rounded-full font-medium">{t('notesList.todayBadge')}</span>
                <span className="text-sm text-black/60">{formatDate(today, locale)}</span>
              </div>
              <p className="text-xl font-bold leading-snug mb-4">{passageRange}</p>
              <div className="flex items-center gap-1 text-sm text-black/60 font-medium">
                <span>{t('notesList.readToday')}</span>
                <span>›</span>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="rounded-3xl shadow-lg">
          <div className="btn-gradient rounded-3xl p-6 text-gray-900 opacity-60">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-black/10 px-2.5 py-1 rounded-full font-medium">{t('notesList.todayBadge')}</span>
              <span className="text-sm text-black/60">{formatDate(today, locale)}</span>
            </div>
            <p className="text-xl font-bold leading-snug mb-4">{t('notesList.notUploaded')}</p>
            <div className="flex items-center gap-1 text-sm text-black/60 font-medium">
              <span>{t('notesList.checkBackLater')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Streak + week progress */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Fire size={20} weight="fill" className="text-heading" />
            <span className="font-bold text-gray-900">{t('notesList.streak', { count: profile?.streak_current ?? 0 })}</span>
          </div>
          <span className="text-xs text-gray-400">{t('notesList.lastSevenDays')}</span>
        </div>
        <div className="flex gap-1.5">
          {weekDates.map(date => {
            const isToday = date === today
            const done = checkedDates.has(date)
            const isRetro = retroDates.has(date)
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm
                  ${done && !isRetro ? 'btn-gradient text-gray-900 font-black' : done && isRetro ? 'bg-primary/40 text-gray-700 font-black' : isToday ? 'border-2 border-primary text-gray-800' : 'bg-gray-100 text-gray-300'}`}>
                  {done && <Check size={14} weight="bold" />}
                </div>
                <span className="text-[10px] text-gray-400">{date.slice(8)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick checkin */}
      <QuickCheckinButton initialCheckedIn={userCheckedIn} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Users size={22} weight="fill" />, value: checkinCount ?? 0, label: t('notesList.statCheckins'), href: '/checkin' },
          { icon: <ChatCircle size={22} weight="fill" />, value: reflectionCount ?? 0, label: t('notesList.statComments'), href: '/community' },
          { icon: <Medal size={22} weight="fill" />, value: unearnedBadges, label: t('notesList.statBadges'), href: '/profile' },
        ].map(s => (
          <Link key={s.href} href={s.href} className="bg-surface rounded-2xl p-3 shadow-sm text-center active:opacity-80 transition-opacity">
            <div className="flex justify-center mb-0.5 text-heading">{s.icon}</div>
            <div className="font-bold text-gray-900 text-base">{s.value}</div>
            <div className="text-[10px] text-gray-400 leading-tight">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Community preview */}
      {(checkinCount ?? 0) > 0 && (
        <div className="bg-surface rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
          <div className="flex -space-x-2 shrink-0">
            {orderedProfiles.map((p) => (
              <BibleAvatar
                key={p.id}
                seed={p.avatar_seed ?? 'alpha'}
                className="w-8 h-8 border-2 border-white"
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 leading-snug">
            {(() => {
              const names = orderedProfiles.map(p => p.display_name).slice(0, 2).join(t('common.listSeparator'))
              const total = checkinCount ?? 0
              if (total === 1) return t('notesList.checkedInOne', { names })
              if (total === 2) return t('notesList.checkedInTwo', { names })
              return t('notesList.checkedInMany', { names, count: total })
            })()}
          </p>
        </div>
      )}

      {/* Past notes */}
      {pastDates.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1">{t('notesList.recentNotes')}</h2>
          <div className="space-y-2">
            {pastDates.map(date => (
              <Link
                key={date}
                href={`/notes/${date}`}
                className="flex items-center justify-between bg-surface rounded-2xl px-5 py-3.5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900">{formatDate(date, locale)}</span>
                  {approvalMode && isAdmin && !approvedDates.has(date) && (
                    <span className="text-[10px] text-primary-dark bg-primary-light px-1.5 py-0.5 rounded-full">{t('notesList.pendingReview')}</span>
                  )}
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
