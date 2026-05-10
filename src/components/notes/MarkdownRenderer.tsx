import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-[#1a1a1a] mb-4">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-[#4a7c59] mt-6 mb-2 pb-1 border-b border-[#e8e0d0]">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-[#1a1a1a] mt-4 mb-1">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-gray-700 leading-7 mb-3">{children}</p>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[#c8a84b] bg-[#fdf8ee] px-4 py-3 my-3 rounded-r-lg text-sm text-gray-700 italic">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="space-y-1.5 my-3">{children}</ul>
        ),
        li: ({ children }) => (
          <li className="flex gap-2 text-sm text-gray-700">
            <span className="text-[#4a7c59] mt-1 shrink-0">•</span>
            <span className="leading-6">{children}</span>
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[#1a1a1a]">{children}</strong>
        ),
        hr: () => <hr className="border-[#e8e0d0] my-4" />,
        a: ({ href, children }) => (
          <a href={href} className="text-[#4a7c59] underline underline-offset-2" target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
