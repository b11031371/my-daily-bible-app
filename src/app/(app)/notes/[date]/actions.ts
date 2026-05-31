'use server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

async function assertAdmin() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) throw new Error('Unauthorized')
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') throw new Error('Unauthorized')
  return { user, supabase }
}

function revalidateNotes(date: string) {
  revalidateTag('bible-notes', { expire: 0 })
  revalidatePath('/notes')
  revalidatePath(`/notes/${date}`)
}

export async function approveNote(date: string) {
  const { user, supabase } = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('note_approvals').upsert({ date, approved_by: user.id })
  revalidateNotes(date)
}

export async function unapproveNote(date: string) {
  const { supabase } = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('note_approvals').delete().eq('date', date)
  revalidateNotes(date)
}
