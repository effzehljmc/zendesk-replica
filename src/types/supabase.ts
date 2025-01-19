export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          auth_user_id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          ticket_number: string
          title: string
          description: string
          status: string
          priority: string
          created_at: string
          updated_at: string
          customer_id: string
          assigned_to_id: string | null
        }
        Insert: {
          id?: string
          ticket_number: string
          title: string
          description: string
          status?: string
          priority?: string
          created_at?: string
          updated_at?: string
          customer_id: string
          assigned_to_id?: string | null
        }
        Update: {
          id?: string
          ticket_number?: string
          title?: string
          description?: string
          status?: string
          priority?: string
          created_at?: string
          updated_at?: string
          customer_id?: string
          assigned_to_id?: string | null
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 