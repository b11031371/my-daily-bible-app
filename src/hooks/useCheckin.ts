'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { todayString } from '@/lib/utils'
import type { Checkin } from '@/types/app'

export function useCheckin(date?: string) {
  const supabase = createClient()
  const targetDate = date ?? todayString()

  const { data, mutate } = useSWR<Checkin | null>(`checkin-${targetDate}`, async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('note_date', targetDate)
      .maybeSingle()
    return data
  })

  return { checkin: data, mutate }
}
