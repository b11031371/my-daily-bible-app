import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchMarkdown, getPdfUrl } from '@/lib/github/api'
import { formatDateZH } from '@/lib/utils'
import { createClient, getUser } from '@/lib/supabase/server'
import NoteViewer from '@/components/notes/NoteViewer'

interface Props {
  params: Promise<{ date: string }>
}

export default async function NotePage({ params }: Props) {
  const { date } = await params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const [user, supabase] = await Promise.all([getUser(), createClient()])
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
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/notes" className="text-gray-400 hover:text-gray-600 text-lg">‹</Link>
        <h1 className="text-base font-semibold text-gray-900">{formatDateZH(date)}</h1>
      </div>
      <NoteViewer
        date={date}
        zhContent={zhContent}
        enContent={enContent}
        zhPdfUrl={zhPdfUrl}
        enPdfUrl={enPdfUrl}
        bibleRange={bibleRange}
        isAdmin={isAdmin}
        isApproved={isApproved}
        approvalMode={approvalMode}
      />
    </div>
  )
}
