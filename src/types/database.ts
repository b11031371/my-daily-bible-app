export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_seed: string
          role: 'user' | 'admin'
          total_points: number
          streak_current: number
          streak_max: number
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_seed?: string
          role?: 'user' | 'admin'
          total_points?: number
          streak_current?: number
          streak_max?: number
          created_at?: string
        }
        Update: {
          display_name?: string
          avatar_seed?: string
          role?: 'user' | 'admin'
          total_points?: number
          streak_current?: number
          streak_max?: number
        }
        Relationships: []
      }
      checkins: {
        Row: {
          id: string
          user_id: string
          note_date: string
          checked_in_at: string
          is_retro: boolean
          days_late: number
          points_earned: number
        }
        Insert: {
          id?: string
          user_id: string
          note_date: string
          checked_in_at?: string
          is_retro?: boolean
          days_late?: number
          points_earned: number
        }
        Update: {
          points_earned?: number
        }
        Relationships: []
      }
      reflections: {
        Row: {
          id: string
          user_id: string
          note_date: string
          content: string
          is_anonymous: boolean
          points_earned: number
          bible_range: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          note_date: string
          content: string
          is_anonymous?: boolean
          points_earned?: number
          bible_range?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          is_anonymous?: boolean
          bible_range?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reflection_likes: {
        Row: {
          id: string
          reflection_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          reflection_id: string
          user_id: string
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      badges: {
        Row: {
          id: string
          name_zh: string
          description_zh: string
          // 多語翻譯（JSONB），例如 {"zh":"仁愛","en":"Love"}；加語言只需塞 key，不動表結構。
          // 缺對應語言時退回 name_zh / description_zh。
          name_i18n: Record<string, string> | null
          description_i18n: Record<string, string> | null
          icon: string
          condition_type: 'streak' | 'total_checkins' | 'total_points' | 'reflection_count'
          condition_value: number
          points_bonus: number
          is_active: boolean
        }
        Insert: {
          id: string
          name_zh: string
          description_zh: string
          name_i18n?: Record<string, string> | null
          description_i18n?: Record<string, string> | null
          icon: string
          condition_type: 'streak' | 'total_checkins' | 'total_points' | 'reflection_count'
          condition_value: number
          points_bonus?: number
          is_active?: boolean
        }
        Update: {
          name_zh?: string
          description_zh?: string
          name_i18n?: Record<string, string> | null
          description_i18n?: Record<string, string> | null
          icon?: string
          condition_type?: 'streak' | 'total_checkins' | 'total_points' | 'reflection_count'
          condition_value?: number
          points_bonus?: number
          is_active?: boolean
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          id: string
          period_type: 'weekly' | 'monthly'
          period_label: string
          user_id: string
          points: number
          checkin_count: number
          rank: number
        }
        Insert: {
          id?: string
          period_type: 'weekly' | 'monthly'
          period_label: string
          user_id: string
          points?: number
          checkin_count?: number
          rank: number
        }
        Update: {
          points?: number
          checkin_count?: number
          rank?: number
        }
        Relationships: []
      }
      admin_log: {
        Row: {
          id: string
          admin_id: string
          action_type: string
          target_user: string | null
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action_type: string
          target_user?: string | null
          payload?: Json
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          invite_code: string
          fruit_order: string[]
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name?: string
          invite_code: string
          fruit_order: string[]
          created_by: string
          created_at?: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          joined_at: string
          left_at: string | null
          role: 'admin' | 'member'
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          joined_at?: string
          left_at?: string | null
          role?: 'admin' | 'member'
        }
        Update: {
          left_at?: string | null
          role?: 'admin' | 'member'
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      fn_checkin: {
        Args: { p_note_date: string }
        Returns: Json
      }
      fn_submit_reflection: {
        Args: { p_note_date: string; p_content: string; p_anonymous: boolean; p_bible_range?: string | null }
        Returns: Json
      }
      fn_evaluate_badges: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      fn_rebuild_leaderboard: {
        Args: { p_period_type: string; p_period_label: string }
        Returns: undefined
      }
      fn_admin_checkin: {
        Args: { p_user_id: string; p_note_date: string; p_points: number }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
