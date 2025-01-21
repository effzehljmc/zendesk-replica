export interface Tag {
  id: string;
  name: string;
  color: string;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_id?: string;
} 