import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Checkin = Database['public']['Tables']['checkins']['Row']
export type Reflection = Database['public']['Tables']['reflections']['Row']
export type Badge = Database['public']['Tables']['badges']['Row']
export type UserBadge = Database['public']['Tables']['user_badges']['Row']
export type LeaderboardEntry = Database['public']['Tables']['leaderboard_snapshots']['Row']

export interface BadgeWithStatus extends Badge {
  earned: boolean
  earned_at?: string
}

export interface ReflectionWithProfile extends Reflection {
  profiles: Pick<Profile, 'display_name' | 'avatar_seed'>
}

export interface LeaderboardEntryWithProfile extends LeaderboardEntry {
  profiles: Pick<Profile, 'display_name' | 'avatar_seed'>
}

export interface CheckinResult {
  points_earned: number
  streak_current: number
  badges_unlocked: string[]
}
