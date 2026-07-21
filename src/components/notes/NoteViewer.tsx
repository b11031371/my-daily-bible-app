'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/i18n/I18nProvider'
import MarkdownRenderer from './MarkdownRenderer'
import ReflectionForm from '@/components/community/ReflectionForm'
import ApprovalBanner from './ApprovalBanner'
import { FilePdf, ChatCircle } from '@phosphor-icons/react'

interface Props {
  date: string
  zhContent: string | null
  enContent: string | null
  zhPdfUrl: string
  enPdfUrl: string
  bibleRange?: string | null
  defaultLang?: 'zh' | 'en'
  isAdmin?: boolean
  isApproved?: boolean
  approvalMode?: boolean
}

export default function NoteViewer({ date, zhContent, enContent, zhPdfUrl, enPdfUrl, bibleRange, defaultLang = 'zh', isAdmin, isApproved, approvalMode }: Props) {
  const { t } = useI18n()
  const [lang, setLang] = useState<'zh' | 'en'>(defaultLang)
  const content = lang === 'zh' ? zhContent : enContent
  const pdfUrl = lang === 'zh' ? zhPdfUrl : enPdfUrl
  const hasMarkdown = zhContent || enContent

  return (
    <div>
      {/* Approval banner (admin only, when approval mode is on) */}
      {isAdmin && approvalMode && (
        <ApprovalBanner date={date} isApproved={!!isApproved} />
      )}

      {/* Language tabs + PDF download */}
      <div className="flex gap-2 mb-4">
        {(['zh', 'en'] as const).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              lang === l
                ? 'btn-gradient text-gray-900'
                : 'bg-surface text-gray-500 border border-gray-200'
            )}
          >
            {l === 'zh' ? '中文' : 'English'}
          </button>
        ))}
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto flex items-center gap-1 text-sm text-gray-700 font-medium px-3 py-1.5 border border-primary rounded-full hover:bg-primary hover:text-gray-900 transition-colors"
        >
          ↓ PDF
        </a>
      </div>

      {/* Note content */}
      <div className="bg-surface rounded-2xl shadow-sm overflow-hidden mb-4">
        {hasMarkdown && content ? (
          <div className="p-5">
            <MarkdownRenderer content={content} />
          </div>
        ) : hasMarkdown && !content ? (
          <div className="p-5 text-center text-sm text-gray-400 py-8">{t('noteView.unavailable')}</div>
        ) : (
          /* PDF embed fallback when no markdown available */
          <div>
            <div className="bg-primary-light px-4 py-2 text-xs text-gray-500 flex items-center gap-1.5">
              <FilePdf size={14} /> {t('noteView.pdfDisplay')}
            </div>
            <iframe
              src={`${pdfUrl}#toolbar=0`}
              className="w-full"
              style={{ height: '75vh' }}
              title={t('noteView.pdfTitle', { date })}
            />
          </div>
        )}
      </div>

      {/* Reflection form */}
      <div id="reflection" className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-heading mb-3">
          <ChatCircle size={16} weight="fill" />
          {t('noteView.shareThoughts')}
        </h3>
        <ReflectionForm date={date} bibleRange={bibleRange ?? null} />
      </div>
    </div>
  )
}
