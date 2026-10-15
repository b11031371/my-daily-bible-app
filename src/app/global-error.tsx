'use client'

import { useEffect } from 'react'
import { ArrowClockwise, BookOpenText, Plant } from '@phosphor-icons/react'
import './globals.css'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="zh-Hant">
      <body>
        <title>內容暫時無法載入 · Sproutiv</title>
        <main id="main-content" className="flex min-h-dvh items-center justify-center bg-theme-bg px-6 py-12">
          <section role="alert" aria-labelledby="global-error-title" className="w-full max-w-md text-center">
            <div className="relative mx-auto mb-8 flex h-48 items-center justify-center overflow-hidden rounded-[2rem] bg-primary-light">
              <BookOpenText aria-hidden="true" size={120} weight="duotone" className="mt-8 text-heading" />
              <Plant aria-hidden="true" size={52} weight="duotone" className="absolute bottom-10 text-heading" />
            </div>
            <p className="mb-2 text-sm font-semibold text-heading">Sproutiv</p>
            <h1 id="global-error-title" className="page-title font-bold text-gray-900">內容暫時無法載入</h1>
            <p className="mt-3 text-sm leading-6 text-gray-500">可能是網路不穩，請稍後再試。</p>
            <button type="button" onClick={unstable_retry} className="btn-gradient mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-semibold text-gray-900 hover:brightness-95">
              <ArrowClockwise aria-hidden="true" size={20} weight="bold" />
              重新載入
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
