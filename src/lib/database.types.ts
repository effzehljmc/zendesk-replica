export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      aggregated_metrics: {
        Row: {
          id: string
          metric_type: string
          metric_name: string
          metric_value: number
          dimension: string | null
          dimension_value: string | null
          period_start: string
          period_end: string
          created_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          metric_type: string
          metric_name: string
          metric_value: number
          dimension?: string | null
          dimension_value?: string | null
          period_start: string
          period_end: string
          created_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          metric_type?: string
          metric_name?: string
          metric_value?: number
          dimension?: string | null
          dimension_value?: string | null
          period_start?: string
          period_end?: string
          created_at?: string
          metadata?: Json
        }
      }
    }
    Views: {
      daily_metrics: {
        Row: {
          day: string
          acceptance_rate: number
          rejection_rate: number
          total_feedback: number
          metadata: Json
        }
      }
    }
    Functions: {
      get_last_7_days_metrics: {
        Args: Record<string, never>
        Returns: {
          day: string
          acceptance_rate: number
          rejection_rate: number
          total_feedback: number
          top_reasons: Json
        }[]
      }
    }
  }
} 