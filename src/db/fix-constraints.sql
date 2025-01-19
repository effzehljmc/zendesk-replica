-- First, drop the table if it exists
DROP TABLE IF EXISTS public.tickets;

-- Create the table with the correct structure
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'medium',
  customer_id uuid NOT NULL,
  assigned_to_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT fk_tickets_customer FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_tickets_assigned_to FOREIGN KEY (assigned_to_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS tickets_customer_id_idx ON public.tickets(customer_id);
CREATE INDEX IF NOT EXISTS tickets_assigned_to_id_idx ON public.tickets(assigned_to_id);

-- Create a unique constraint on ticket_number
CREATE UNIQUE INDEX IF NOT EXISTS tickets_ticket_number_key ON public.tickets(ticket_number);

-- Verify the constraints
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'tickets' AND table_schema = 'public'; 