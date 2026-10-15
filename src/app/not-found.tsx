import ErrorState from '@/components/layout/ErrorState'

export default function NotFound() {
  return <main id="main-content" tabIndex={-1}><ErrorState kind="not-found" /></main>
}
