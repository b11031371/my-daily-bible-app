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

export interface ReflectionComment {
  id: string
  reflection_id: string
  user_id: string
  content: string
  created_at: string
  profiles: Pick<Profile, 'display_name' | 'avatar_seed'>
}

export interface ReflectionWithProfile extends Reflection {
  note_date: string
  bible_range: string | null
  profiles: Pick<Profile, 'display_name' | 'avatar_seed'>
  reflection_likes: ReflectionLike[]
  reflection_comments: ReflectionComment[]
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

export interface ReflectionFilters {
  month?: string
  user_name?: string
  selfOnly?: boolean
  bible_book?: string
  keyword?: string
}

export interface CheckinResult {
  points_earned: number
  streak_current: number
  badges_unlocked: string[]
}

// ── 測驗 ─────────────────────────────────────────────────────────────────────

export type Quiz = Database['public']['Tables']['quizzes']['Row']
export type QuizQuestion = Database['public']['Tables']['quiz_questions']['Row']
export type QuizRoom = Database['public']['Tables']['quiz_rooms']['Row']
export type QuizRoomStatus = QuizRoom['status']

export interface QuizWithCount extends Quiz {
  question_count: number
  /** 目前還開著的房間 PIN，有值代表這份測驗正在進行中 */
  active_pin: string | null
}

/** 編輯器在前端操作的形狀：沒有 id，整包送出後由伺服器重建 */
export interface QuizQuestionDraft {
  prompt: string
  options: string[]
  correct_index: number
  explanation: string | null
  time_limit_seconds: number
}

export interface QuizRoomPlayerView {
  id: string
  nickname: string
  avatar_seed: string
  score: number
}

/**
 * 玩家端看到的題目。correct_index / explanation / distribution 只有在
 * status='reveal' 時才由伺服器填入——答題階段這些欄位一定是 undefined。
 */
export interface QuizQuestionView {
  index: number
  prompt: string
  options: string[]
  time_limit_seconds: number
  answered_count: number
  total_players: number
  correct_index?: number
  explanation?: string | null
  my_choice?: number | null
  my_points?: number
  distribution?: number[]
}

export interface QuizRoomState {
  /** 伺服器時間，client 用它校正時鐘後才算倒數 */
  server_now: string
  room: {
    pin: string
    status: QuizRoomStatus
    current_index: number
    total_questions: number
    question_started_at: string | null
  }
  quiz: { title: string }
  is_host: boolean
  me: {
    player_id: string
    nickname: string
    avatar_seed: string
    score: number
    rank: number
    answered: boolean
  } | null
  players: QuizRoomPlayerView[]
  question: QuizQuestionView | null
}
