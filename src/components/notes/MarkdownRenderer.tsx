import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

const components: Components = {
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
  ul: ({ children, className }) => (
    <ul className={`my-3 space-y-1.5 text-sm leading-6 text-gray-700 marker:text-gray-500 [&_ul]:my-2 [&_ul]:list-[circle] [&_ol]:my-2 ${className?.includes('contains-task-list') ? 'list-none pl-0' : 'list-disc pl-6'}`}>
      {children}
    </ul>
  ),
  ol: ({ children, start }) => (
    <ol start={start} className="my-3 list-decimal space-y-1.5 pl-6 text-sm leading-6 text-gray-700 marker:font-semibold marker:text-gray-900 [&_ul]:my-2 [&_ol]:my-2">
      {children}
    </ol>
  ),
  li: ({ children, className }) => (
    <li className={`[&>p]:mb-2 [&>p:last-child]:mb-0 [&>input]:mr-2 ${className?.includes('task-list-item') ? 'list-none' : 'pl-1'}`}>
      {children}
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
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}
