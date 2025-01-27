-- Create function to handle new tickets
CREATE OR REPLACE FUNCTION public.handle_new_ticket()
RETURNS trigger AS $$
DECLARE
  system_user_id uuid;
  edge_function_url text;
  anon_key text;
BEGIN
  -- Get system user ID
  SELECT id INTO system_user_id 
  FROM public.profiles 
  WHERE email = 'ai-system@internal.zendesk-replica.com';

  -- Get Edge Function URL and anon key from app_settings
  SELECT value INTO edge_function_url 
  FROM app_settings 
  WHERE key = 'edge_function_url';

  SELECT value INTO anon_key 
  FROM app_settings 
  WHERE key = 'anon_key';

  -- Call the generate-response Edge Function
  PERFORM net.http_post(
    url := edge_function_url || '/generate-response',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'ticket', jsonb_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'description', NEW.description
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new customer messages
CREATE OR REPLACE FUNCTION public.handle_new_customer_message()
RETURNS trigger AS $$
DECLARE
  v_customer_role_id uuid;
  v_is_customer boolean;
  v_edge_function_url text;
  v_system_user_id uuid;
BEGIN
  -- Get customer role ID
  SELECT id INTO v_customer_role_id 
  FROM roles 
  WHERE name = 'customer';

  -- Check if the message is from a customer
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = NEW.user_id 
    AND role_id = v_customer_role_id
  ) INTO v_is_customer;

  -- Only proceed if it's a customer message
  IF v_is_customer THEN
    -- Get system user ID
    SELECT id INTO v_system_user_id 
    FROM profiles 
    WHERE email = 'ai-system@internal.zendesk-replica.com';

    -- Get Edge Function URL from settings
    SELECT value->>'url' INTO v_edge_function_url 
    FROM settings 
    WHERE key = 'edge_function_url';

    -- Call the generate-message-suggestion Edge Function
    PERFORM net.http_post(
      url := v_edge_function_url || '/generate-message-suggestion',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value->>'key' FROM settings WHERE key = 'supabase_anon_key')
      ),
      body := jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'message_id', NEW.id,
        'system_user_id', v_system_user_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new tickets
DROP TRIGGER IF EXISTS on_new_ticket ON public.tickets;
CREATE TRIGGER on_new_ticket
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_ticket();

-- Create trigger for new messages
DROP TRIGGER IF EXISTS on_new_customer_message ON public.ticket_messages;
CREATE TRIGGER on_new_customer_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer_message();
