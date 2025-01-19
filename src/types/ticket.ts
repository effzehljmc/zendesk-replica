export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "new" | "open" | "pending" | "resolved" | "closed";

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  customer_id: string;
  assigned_to_id: string | null;
  customer?: {
    full_name: string;
    email: string;
  };
  assigned_to?: {
    full_name: string;
    email: string;
  };
}

export type CreateTicketData = Pick<Ticket, "title" | "description" | "priority">; 