import { notFound } from 'next/navigation'
import PlayerGame from '@/components/quiz/PlayerGame'
import { isValidPin } from '@/lib/quiz-server'

export default async function PlayRoomPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params
  if (!isValidPin(pin)) notFound()
  return <main id="main-content" tabIndex={-1}><PlayerGame pin={pin} /></main>
}
