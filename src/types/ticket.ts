export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

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

export interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer_id: string;
  assigned_to_id: string | null;
  created_at: string;
  updated_at: string;
  firstResponseAt: string | null;
  customer?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  assigned_to?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  tags?: Tag[];
  satisfaction_rating?: number;
}

export interface CreateTicketData {
  title: string;
  description: string;
  priority: TicketPriority;
  tags?: string[];
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to_id?: string | null;
  tags?: string[];
  satisfaction_rating?: number;
}

export interface TicketMessage {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  user?: {
    id: string;
    fullName: string | null;
    email: string | null;
  };
  attachments?: {
    id: string;
    fileName: string;
    fileSize: number;
    contentType: string;
    storagePath: string;
  }[];
  isAIGenerated?: boolean;
}

export interface TicketMessageResponse {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_ai_generated: boolean;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
  ticket_message_attachments: {
    id: string;
    file_name: string;
    file_size: number;
    content_type: string;
    storage_path: string;
  }[];
} 