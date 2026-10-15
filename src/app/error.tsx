'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/layout/ErrorState'

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <ErrorState kind="error" onRetry={unstable_retry} />
}
