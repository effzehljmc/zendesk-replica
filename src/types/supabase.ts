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
      kb_articles: {
        Row: {
          id: string
          title: string
          content: string
          is_public: boolean
          author_id: string
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          is_public?: boolean
          author_id?: string
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          is_public?: boolean
          author_id?: string
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_kb_articles: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: string
          is_public: boolean
          author_id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 