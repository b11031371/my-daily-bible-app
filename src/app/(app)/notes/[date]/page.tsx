import { notFound, redirect } from 'next/navigation'
import { fetchMarkdown, getPdfUrl } from '@/lib/github/api'
import { formatDate } from '@/lib/utils'
import { createClient, getUser } from '@/lib/supabase/server'
import { getServerI18n } from '@/lib/i18n/server'
import { noteLangFor } from '@/lib/i18n'
import NoteViewer from '@/components/notes/NoteViewer'
import ReadingProgressHeader from '@/components/notes/ReadingProgressHeader'

interface Props {
  params: Promise<{ date: string }>
}

export default async function NotePage({ params }: Props) {
  const { date } = await params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const [user, supabase, { locale }] = await Promise.all([getUser(), createClient(), getServerI18n()])
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [[zhContent, enContent], [{ data: profile }, { data: approval }, { data: setting }]] = await Promise.all([
    Promise.all([fetchMarkdown(date, 'zh'), fetchMarkdown(date, 'en')]),
    Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      sb.from('note_approvals').select('date').eq('date', date).maybeSingle(),
      sb.from('app_settings').select('value').eq('key', 'approval_mode').single(),
    ]),
  ])

  const isAdmin = profile?.role === 'admin'
  const isApproved = !!approval
  const approvalMode = setting?.value === 'true'

  if (approvalMode && !isAdmin && !isApproved) notFound()

  const zhPdfUrl = getPdfUrl(date, 'zh')
  const enPdfUrl = getPdfUrl(date, 'en')

  const bibleRangeMatch = zhContent?.match(/\*\*和合本[：:]\*\*\s*(.+)/)
  const bibleRange = bibleRangeMatch?.[1]?.trim() ?? null

  return (
    // 頂端不留 padding：標題列（同時是閱讀進度條）要從一開始就貼齊畫面頂端
    <div className="max-w-lg mx-auto px-4 pb-6">
      <ReadingProgressHeader
        userId={user.id}
        date={date}
        title={formatDate(date, locale)}
        backHref="/notes"
        backLabel={locale === 'zh' ? '返回筆記列表' : 'Back to notes'}
        progressLabel={locale === 'zh' ? '閱讀進度' : 'Reading progress'}
      />
      <NoteViewer
        date={date}
        zhContent={zhContent}
        enContent={enContent}
        zhPdfUrl={zhPdfUrl}
        enPdfUrl={enPdfUrl}
        bibleRange={bibleRange}
        defaultLang={noteLangFor(locale)}
        isAdmin={isAdmin}
        isApproved={isApproved}
        approvalMode={approvalMode}
      />
    </div>
  )
}
