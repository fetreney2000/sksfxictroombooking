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
    Functions: Record<string, never>
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
