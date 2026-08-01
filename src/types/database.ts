export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'supervisor'
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: 'admin' | 'supervisor'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'supervisor'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      teachers: {
        Row: {
          id: string
          full_name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          id: string
          start_time: string
          end_time: string
          sort_order: number
          is_active: boolean
        }
        Insert: {
          id?: string
          start_time: string
          end_time: string
          sort_order: number
          is_active?: boolean
        }
        Update: {
          id?: string
          start_time?: string
          end_time?: string
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      blocked_dates: {
        Row: {
          id: string
          blocked_date: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          blocked_date: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          blocked_date?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          booking_date: string
          time_slot_id: string
          teacher_id: string
          class_name: string
          purpose: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_date: string
          time_slot_id: string
          teacher_id: string
          class_name: string
          purpose: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_date?: string
          time_slot_id?: string
          teacher_id?: string
          class_name?: string
          purpose?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_time_slot_id_fkey'
            columns: ['time_slot_id']
            isOneToOne: false
            referencedRelation: 'time_slots'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      login: {
        Args: { p_username: string; p_password: string }
        Returns: {
          token: string
          user: { id: string; username: string; full_name: string; role: 'admin' | 'supervisor' }
        } | null
      }
      me: {
        Args: { p_token: string }
        Returns: {
          id: string
          username: string
          full_name: string
          role: 'admin' | 'supervisor'
          is_active: boolean
        } | null
      }
      has_users: {
        Args: Record<string, never>
        Returns: boolean
      }
      logout: {
        Args: { p_token: string }
        Returns: null
      }
      bootstrap_admin: {
        Args: { p_username: string; p_password: string; p_full_name?: string }
        Returns: string | null
      }
      admin_create_user: {
        Args: {
          p_token: string
          p_username: string
          p_password: string
          p_full_name: string
          p_role?: string
        }
        Returns: string | null
      }
      admin_update_user: {
        Args: {
          p_token: string
          p_user_id: string
          p_full_name: string
          p_role: string
          p_is_active: boolean
          p_new_password?: string | null
        }
        Returns: null
      }
      admin_list_users: {
        Args: { p_token: string }
        Returns: {
          id: string
          username: string
          full_name: string
          role: 'admin' | 'supervisor'
          is_active: boolean
          created_at: string
        }[]
      }
      admin_save_teacher: {
        Args: { p_token: string; p_teacher_id: string | null; p_full_name: string }
        Returns: null
      }
      admin_set_teacher_active: {
        Args: { p_token: string; p_teacher_id: string; p_is_active: boolean }
        Returns: null
      }
      admin_delete_teacher: {
        Args: { p_token: string; p_teacher_id: string }
        Returns: null
      }
      admin_save_time_slot: {
        Args: {
          p_token: string
          p_slot_id: string
          p_start_time: string
          p_end_time: string
          p_sort_order: number
          p_is_active: boolean
        }
        Returns: null
      }
      admin_toggle_time_slot: {
        Args: { p_token: string; p_slot_id: string; p_is_active: boolean }
        Returns: null
      }
      admin_reorder_time_slot: {
        Args: { p_token: string; p_slot_id: string; p_sort_order: number }
        Returns: null
      }
      admin_add_blocked_date: {
        Args: { p_token: string; p_blocked_date: string; p_reason?: string | null }
        Returns: null
      }
      admin_remove_blocked_date: {
        Args: { p_token: string; p_blocked_date_id: string }
        Returns: null
      }
      admin_update_booking: {
        Args: {
          p_token: string
          p_booking_id: string
          p_booking_date: string
          p_time_slot_id: string
          p_teacher_id: string
          p_class_name: string
          p_purpose: string
        }
        Returns: null
      }
      admin_delete_booking: {
        Args: { p_token: string; p_booking_id: string }
        Returns: null
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
