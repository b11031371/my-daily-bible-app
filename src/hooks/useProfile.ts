'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/app'

export function useProfile() {
  const supabase = createClient()

  const { data, error, mutate } = useSWR<Profile | null>('profile', async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    return data
  })

  return { profile: data, loading: !data && !error, mutate }
}
