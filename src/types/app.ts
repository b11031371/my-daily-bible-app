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

export interface ReflectionLike {
  user_id: string
  profiles: Pick<Profile, 'avatar_seed'> | null
}

export interface ReflectionWithProfile extends Reflection {
  profiles: Pick<Profile, 'display_name' | 'avatar_seed'>
  reflection_likes: ReflectionLike[]
}

export interface LeaderboardEntryWithProfile extends LeaderboardEntry {
  profiles: Pick<Profile, 'display_name' | 'avatar_seed'>
}

export interface CheckinWithProfile extends Checkin {
  profiles: Pick<Profile, 'display_name' | 'avatar_seed'> | null
}

export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']

export interface GroupMemberWithProfile extends GroupMember {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_seed'>
}

export interface GroupWithMembers extends Group {
  group_members: GroupMemberWithProfile[]
  tree_points: number
}

export interface CheckinResult {
  points_earned: number
  streak_current: number
  badges_unlocked: string[]
}
