'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import MarkdownRenderer from './MarkdownRenderer'
import ReflectionForm from '@/components/community/ReflectionForm'

interface Props {
  date: string
  zhContent: string | null
  enContent: string | null
  zhPdfUrl: string
  enPdfUrl: string
}

export default function NoteViewer({ date, zhContent, enContent, zhPdfUrl, enPdfUrl }: Props) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh')
  const content = lang === 'zh' ? zhContent : enContent
  const pdfUrl = lang === 'zh' ? zhPdfUrl : enPdfUrl
  const hasMarkdown = zhContent || enContent

  return (
    <div>
      {/* Language tabs + PDF download */}
      <div className="flex gap-2 mb-4">
        {(['zh', 'en'] as const).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              lang === l
                ? 'bg-primary text-gray-900'
                : 'bg-white text-gray-500 border border-gray-200'
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
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        {hasMarkdown && content ? (
          <div className="p-5">
            <MarkdownRenderer content={content} />
          </div>
        ) : hasMarkdown && !content ? (
          <div className="p-5 text-center text-sm text-gray-400 py-8">此語言版本無法取得</div>
        ) : (
          /* PDF embed fallback when no markdown available */
          <div>
            <div className="bg-[#f5f3ee] px-4 py-2 text-xs text-gray-500 flex items-center gap-1.5">
              <span>📄</span> 以 PDF 顯示
            </div>
            <iframe
              src={`${pdfUrl}#toolbar=0`}
              className="w-full"
              style={{ height: '75vh' }}
              title={`筆記 ${date}`}
            />
          </div>
        )}
      </div>

      {/* Reflection form */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">💬 分享你的想法</h3>
        <ReflectionForm date={date} />
      </div>
    </div>
  )
}
