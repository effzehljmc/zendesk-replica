export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string | null;
    email: string | null;
  };
}

export interface CreateMessageData {
  content: string;
} 