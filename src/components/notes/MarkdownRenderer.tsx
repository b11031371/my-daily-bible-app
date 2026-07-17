import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        h1: ({ children }) => (
          <h1 className="page-title font-bold text-heading mb-4">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-gray-900 mt-6 mb-2 pb-1 border-b border-gray-200">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-1">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-gray-700 leading-7 mb-3">{children}</p>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary bg-primary-light px-4 py-3 my-3 rounded-r-lg text-sm text-gray-700 italic">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="space-y-1.5 my-3">{children}</ul>
        ),
        li: ({ children }) => (
          <li className="flex gap-2 text-sm text-gray-700">
            <span className="text-gray-500 mt-1 shrink-0">•</span>
            <span className="leading-6">{children}</span>
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        hr: () => <hr className="border-gray-200 my-4" />,
        a: ({ href, children }) => (
          <a href={href} className="text-gray-700 underline underline-offset-2 break-all" target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
