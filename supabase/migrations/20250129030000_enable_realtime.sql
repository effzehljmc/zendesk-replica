-- Enable realtime for ticket_messages table
ALTER TABLE ticket_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages; 