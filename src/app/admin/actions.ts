'use server'
import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

async function assertAdmin() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) throw new Error('Unauthorized')
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') throw new Error('Unauthorized')
  return { user, supabase }
}

export async function setApprovalMode(enabled: boolean) {
  const { supabase } = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('app_settings').update({ value: enabled ? 'true' : 'false' }).eq('key', 'approval_mode')
  revalidatePath('/notes')
  revalidatePath('/notes/[date]', 'page')
  revalidatePath('/admin')
}
