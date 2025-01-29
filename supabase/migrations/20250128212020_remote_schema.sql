

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "drizzle";


ALTER SCHEMA "drizzle" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."feedback_type" AS ENUM (
    'rejection',
    'revision',
    'approval'
);


ALTER TYPE "public"."feedback_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_hourly_metrics"("start_time" timestamp with time zone DEFAULT ("date_trunc"('hour'::"text", "now"()) - '01:00:00'::interval), "end_time" timestamp with time zone DEFAULT "date_trunc"('hour'::"text", "now"())) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 1. Rejection rate by reason
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        dimension,
        dimension_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'rejection_rate_by_reason',
        COALESCE(COUNT(*) FILTER (WHERE feedback_type = 'rejection')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0), 0),
        'feedback_reason',
        feedback_reason,
        start_time,
        end_time
    FROM ai_feedback_events
    WHERE created_at >= start_time AND created_at < end_time
    GROUP BY feedback_reason
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;

    -- 2. Overall acceptance rate
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'overall_acceptance_rate',
        COALESCE(COUNT(*) FILTER (WHERE feedback_type = 'approval')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0), 0),
        start_time,
        end_time
    FROM ai_feedback_events
    WHERE created_at >= start_time AND created_at < end_time
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;

    -- 3. Average confidence scores comparison
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        dimension,
        dimension_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'avg_confidence_score',
        AVG(s.confidence_score),
        'feedback_type',
        fe.feedback_type::text,
        start_time,
        end_time
    FROM ai_feedback_events fe
    JOIN ai_suggestions s ON s.id = fe.suggestion_id
    WHERE fe.created_at >= start_time AND fe.created_at < end_time
    GROUP BY fe.feedback_type
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;

    -- 4. Time to feedback metrics
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'avg_time_to_feedback_seconds',
        EXTRACT(EPOCH FROM AVG(time_to_feedback)),
        start_time,
        end_time
    FROM ai_feedback_events
    WHERE created_at >= start_time AND created_at < end_time
    AND time_to_feedback IS NOT NULL
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;

    -- 5. Top feedback reasons
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        dimension,
        dimension_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'feedback_reason_count',
        COUNT(*)::NUMERIC,
        'feedback_reason',
        feedback_reason,
        start_time,
        end_time
    FROM ai_feedback_events
    WHERE created_at >= start_time AND created_at < end_time
    AND feedback_reason IS NOT NULL
    GROUP BY feedback_reason
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;
END;
$$;


ALTER FUNCTION "public"."compute_hourly_metrics"("start_time" timestamp with time zone, "end_time" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."compute_hourly_metrics"("start_time" timestamp with time zone, "end_time" timestamp with time zone) IS 'Computes hourly metrics for feedback analysis';



CREATE OR REPLACE FUNCTION "public"."create_ticket_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO conversations (
    title,
    customer_id,
    agent_id,
    ticket_id,
    status
  ) VALUES (
    'Ticket #' || NEW.ticket_number,
    NEW.customer_id,
    NEW.assigned_to_id,
    NEW.id,
    'active'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_ticket_conversation"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ticket_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    "created_by_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_notes_visibility_check" CHECK (("visibility" = ANY (ARRAY['private'::"text", 'team'::"text", 'public'::"text"])))
);


ALTER TABLE "public"."ticket_notes" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_ticket_note"("p_ticket_id" "uuid", "p_content" "text", "p_created_by_id" "uuid", "p_is_agent_or_admin" boolean, "p_visibility" "text" DEFAULT 'private'::"text") RETURNS SETOF "public"."ticket_notes"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_note_id UUID;
BEGIN
  -- First, create the note
  INSERT INTO ticket_notes (
    ticket_id,
    content,
    visibility,
    created_by_id
  ) VALUES (
    p_ticket_id,
    p_content,
    p_visibility,
    p_created_by_id
  )
  RETURNING id INTO v_note_id;

  -- If this is an agent/admin and it's their first note on this ticket,
  -- update the first_response_at if it's not already set
  IF p_is_agent_or_admin THEN
    UPDATE tickets
    SET first_response_at = NOW()
    WHERE id = p_ticket_id
    AND first_response_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM ticket_notes
      WHERE ticket_id = p_ticket_id
      AND created_by_id = p_created_by_id
      AND id != v_note_id
    );
  END IF;

  -- Return the created note
  RETURN QUERY
  SELECT *
  FROM ticket_notes
  WHERE id = v_note_id;
END;
$$;


ALTER FUNCTION "public"."create_ticket_note"("p_ticket_id" "uuid", "p_content" "text", "p_created_by_id" "uuid", "p_is_agent_or_admin" boolean, "p_visibility" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_customer_message"("p_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "role_name" "text", "has_role" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        r.name,
        true
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE p.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."debug_customer_message"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agent_unread_messages_count"("agent_id" "uuid") RETURNS TABLE("ticket_id" "uuid", "conversation_id" "uuid", "unread_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as ticket_id,
    c.id as conversation_id,
    COUNT(m.id) as unread_count
  FROM tickets t
  JOIN conversations c ON c.ticket_id = t.id
  JOIN chat_messages m ON m.conversation_id = c.id
  WHERE t.assigned_to_id = agent_id
    AND m.unread = true
    AND m.sender_type = 'customer'
  GROUP BY t.id, c.id;
END;
$$;


ALTER FUNCTION "public"."get_agent_unread_messages_count"("agent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_chat_attachment_url"("file_path" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  conversation_id UUID;
  user_has_access BOOLEAN;
BEGIN
  -- Extract conversation_id from file path
  conversation_id := SPLIT_PART(file_path, '/', 1)::uuid;
  
  -- Check if user has access to this conversation
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (
      customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      OR agent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    )
  ) INTO user_has_access;
  
  -- Return signed URL only if user has access
  IF user_has_access THEN
    RETURN storage.generate_presigned_url(
      'chat_attachments',
      file_path,
      3600 -- URL expires in 1 hour
    );
  ELSE
    RETURN NULL;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_chat_attachment_url"("file_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_ai_system_user"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_auth_id uuid;
BEGIN
  -- Try to get existing system user
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'ai-system@internal.zendesk-replica.com'
  LIMIT 1;
  
  -- If not exists, create it
  IF v_user_id IS NULL THEN
    -- First create auth user using Supabase's auth.users() function
    v_auth_id := extensions.uuid_generate_v4();
    
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token)
    VALUES
      ('00000000-0000-0000-0000-000000000000', -- instance_id
       v_auth_id, -- id
       'authenticated', -- aud
       'authenticated', -- role
       'ai-system@internal.zendesk-replica.com', -- email
       extensions.crypt('AI_SYSTEM_PLACEHOLDER_PWD', extensions.gen_salt('bf')), -- encrypted_password
       now(), -- email_confirmed_at
       now(), -- created_at
       now(), -- updated_at
       '' -- confirmation_token (empty since email is confirmed)
      );

    -- Then create profile
    INSERT INTO profiles (auth_user_id, email, full_name)
    VALUES (v_auth_id, 'ai-system@internal.zendesk-replica.com', 'AI Assistant')
    RETURNING id INTO v_user_id;
  END IF;
  
  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_ai_system_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_similar_articles"("_article_id" "uuid", "_match_count" integer DEFAULT 3) RETURNS TABLE("id" "uuid", "title" character varying, "content" "text", "is_public" boolean, "author_id" "uuid", "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ka.id,
    ka.title,
    ka.content,
    ka.is_public,
    ka.author_id,
    ka.created_at,
    ka.updated_at,
    1 - (
      ka.embedding <=> (
        SELECT kb.embedding
        FROM kb_articles kb
        WHERE kb.id = _article_id
      )
    ) AS similarity
  FROM kb_articles ka
  WHERE 
    ka.id != _article_id
    AND ka.is_public = TRUE
  ORDER BY
    ka.embedding <=> (
      SELECT kb2.embedding
      FROM kb_articles kb2
      WHERE kb2.id = _article_id
    )
  LIMIT _match_count;
END;
$$;


ALTER FUNCTION "public"."get_similar_articles"("_article_id" "uuid", "_match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ticket_ai_suggestions"("p_ticket_id" "uuid", "p_limit" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "content" "text", "confidence_score" double precision, "metadata" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    id,
    content,
    confidence_score,
    metadata,
    created_at
  FROM ticket_messages
  WHERE
    ticket_id = p_ticket_id
    AND message_type = 'auto_suggestion'
  ORDER BY
    confidence_score DESC,
    created_at DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION "public"."get_ticket_ai_suggestions"("p_ticket_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_is_customer boolean;
BEGIN
  -- Check if the message is from a customer
  SELECT is_customer(NEW.user_id) INTO v_is_customer;
  
  IF v_is_customer THEN
    -- Insert a new AI suggestion request
    INSERT INTO ai_suggestion_requests (
      ticket_id,
      message_id,
      status,
      metadata
    ) VALUES (
      NEW.ticket_id,
      NEW.id,
      'pending',
      jsonb_build_object(
        'message_content', NEW.content,
        'created_at', NEW.created_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_ticket"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_ticket"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_customer"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1 AND r.name = 'customer'
  );
END;
$_$;


ALTER FUNCTION "public"."is_customer"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_conversation_messages_read"("p_conversation_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE chat_messages
  SET 
    unread = false,
    updated_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND unread = true
    AND sender_id != p_user_id;
END;
$$;


ALTER FUNCTION "public"."mark_conversation_messages_read"("p_conversation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_kb_articles"("query_text" "text") RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.id,
        kb.title,
        kb.content,
        1 - (kb.embedding <=> embedding_vector) as similarity
    FROM 
        kb_articles kb,
        generate_embedding(query_text) embedding_vector
    ORDER BY 
        kb.embedding <=> embedding_vector
    LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."match_kb_articles"("query_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_kb_articles"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.2, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "title" character varying, "content" "text", "is_public" boolean, "author_id" "uuid", "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ka.id,
    ka.title,
    ka.content,
    ka.is_public,
    ka.author_id,
    ka.created_at,
    ka.updated_at,
    1 - (ka.embedding <=> query_embedding) as similarity
  FROM kb_articles ka
  WHERE 
    ka.is_public = TRUE
    AND 1 - (ka.embedding <=> query_embedding) > match_threshold
  ORDER BY ka.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_kb_articles"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_kb_articles"("query_text" "text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 3, "service_role_key" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "title" character varying, "content" "text", "is_public" boolean, "author_id" "uuid", "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  query_embedding vector(1536);
  embedding_response json;
  http_response http_response;
  auth_key text;
begin
  -- Determine which key to use
  auth_key := COALESCE(
    service_role_key, 
    current_setting('request.jwt.claim.service_role', true)
  );

  -- Call the Edge Function to get the embedding
  SELECT * INTO http_response
  FROM http((
    'POST',
    'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-embedding',
    ARRAY[http_header('Authorization', 'Bearer ' || auth_key)],
    'application/json',
    json_build_object('text', query_text)::text
  )::http_request);

  -- Parse the response
  embedding_response := http_response.content::json;

  -- Extract the embedding from the response
  query_embedding := (embedding_response->>'embedding')::vector;

  -- Return matching articles
  return query
  select
    ka.id,
    ka.title,
    ka.content,
    ka.is_public,
    ka.author_id,
    ka.created_at,
    ka.updated_at,
    1 - (ka.embedding <=> query_embedding) as similarity
  from kb_articles ka
  where 1 - (ka.embedding <=> query_embedding) >= match_threshold
  order by ka.embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_kb_articles"("query_text" "text", "match_threshold" double precision, "match_count" integer, "service_role_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_kb_articles"("query_text" "text", "match_threshold" double precision, "match_count" integer, "service_role_key" "text") IS 'Matches knowledge base articles using semantic search. Parameters:
   - query_text: The text to match against
   - match_threshold: Minimum similarity score (0-1) required to include an article
   - match_count: Maximum number of articles to return
   - service_role_key: Optional service role key to use instead of JWT claim';



CREATE OR REPLACE FUNCTION "public"."notify_customer_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role text;
    system_user_id uuid;
    v_suggestion_id uuid;
BEGIN
    -- Initial trigger execution log
    RAISE NOTICE 'Trigger executing for message ID: %, Content: %', NEW.id, NEW.content;

    -- Get user's role with logging
    SELECT r.name INTO user_role
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = NEW.user_id
    LIMIT 1;
    
    RAISE NOTICE 'User role determined: % for user_id: %', COALESCE(user_role, 'none'), NEW.user_id;

    -- Get system user id with logging
    SELECT id INTO system_user_id
    FROM profiles
    WHERE email = 'ai-system@internal.zendesk-replica.com'
    LIMIT 1;
    
    RAISE NOTICE 'System user ID retrieved: %', COALESCE(system_user_id::text, 'not found');

    -- Only notify for customer messages
    IF user_role = 'customer' THEN
        RAISE NOTICE 'Processing customer message. Starting AI suggestion creation...';
        
        IF system_user_id IS NULL THEN
            RAISE EXCEPTION 'System user not found. Please check ai-system@internal.zendesk-replica.com exists.';
        END IF;

        -- Create AI suggestion request with detailed logging
        RAISE NOTICE 'Inserting new AI suggestion for ticket_id: %, message_id: %', NEW.ticket_id, NEW.id;
        
        INSERT INTO ai_suggestions (
            ticket_id,
            message_id,
            suggested_response,
            confidence_score,
            system_user_id,
            metadata,
            status
        ) VALUES (
            NEW.ticket_id,
            NEW.id,
            'Processing...',
            0.0,
            system_user_id,
            jsonb_build_object(
                'customer_message', NEW.content,
                'created_at', NEW.created_at
            ),
            'pending'
        ) RETURNING id INTO v_suggestion_id;
        
        RAISE NOTICE 'Successfully created AI suggestion with ID: % for message: %', v_suggestion_id, NEW.id;

        -- Log Edge Function call attempt
        RAISE NOTICE 'Attempting Edge Function call for suggestion_id: %', v_suggestion_id;

        -- Call Edge Function
        PERFORM http((
            'POST',
            (SELECT value FROM app_settings WHERE key = 'edge_function_url') || '/generate-message-suggestion',
            ARRAY[
                http_header('Content-Type', 'application/json'),
                http_header('Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcXlkcW1xdW5kYnpuaWVkYmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzI3NjMzOSwiZXhwIjoyMDUyODUyMzM5fQ.M96x8QzbEEsegD85uYEg7lmgRTsQIRU6p0CIvlpCKw0')
            ],
            'application/json',
            json_build_object(
                'message_id', NEW.id,
                'ticket_id', NEW.ticket_id,
                'suggestion_id', v_suggestion_id,
                'system_user_id', system_user_id
            )::text
        )::http_request);
        
        RAISE NOTICE 'Edge Function call completed for suggestion: %', v_suggestion_id;
    ELSE
        RAISE NOTICE 'Skipping AI suggestion - user role is % (not a customer message)', COALESCE(user_role, 'unknown');
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Detailed error logging
    RAISE WARNING 'Error in notify_customer_message at % line %', SQLSTATE, LINE;
    RAISE WARNING 'Error details: %', SQLERRM;
    RAISE WARNING 'Context: message_id=%, user_role=%, system_user_id=%', 
        NEW.id, COALESCE(user_role, 'unknown'), COALESCE(system_user_id::text, 'not found');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_customer_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_ticket_created"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Notify about new ticket
  PERFORM pg_notify(
    'new_ticket_created',
    json_build_object(
      'ticket_id', NEW.id,
      'title', NEW.title,
      'description', NEW.description,
      'customer_id', NEW.customer_id,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_ticket_created"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_ticket_created"() IS 'Notifies Edge Function when a new ticket is created';



CREATE OR REPLACE FUNCTION "public"."on_ticket_created"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_edge_function_url text := 'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-response';
  v_service_role_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  -- We'll use pg_notify to trigger the Edge Function
  -- This allows us to keep the async nature of the original implementation
  PERFORM pg_notify('new_ticket', json_build_object(
    'ticket_id', NEW.id,
    'title', NEW.title,
    'description', NEW.description,
    'edge_function_url', v_edge_function_url,
    'service_role_key', v_service_role_key
  )::text);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_ticket_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_customer_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    edge_url text;
    service_role_key text;
BEGIN
    -- Get settings
    SELECT value INTO edge_url
    FROM app_settings
    WHERE key = 'edge_function_url';

    SELECT value INTO service_role_key
    FROM app_settings
    WHERE key = 'service_role_key';

    -- Only process if an AI suggestion was created
    IF EXISTS (
        SELECT 1 
        FROM ai_suggestions 
        WHERE (metadata->>'message_id')::uuid = NEW.id
    ) THEN
        -- Use pg_net to make async HTTP request
        PERFORM net.http_post(
            url := edge_url || '/generate-message-suggestion',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_role_key
            ),
            body := jsonb_build_object(
                'id', NEW.id,
                'ticket_id', NEW.ticket_id,
                'content', NEW.content,
                'user_id', NEW.user_id,
                'created_at', NEW.created_at
            )
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_customer_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."schedule_hourly_metrics"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM compute_hourly_metrics(
        date_trunc('hour', now()) - interval '1 hour',
        date_trunc('hour', now())
    );
END;
$$;


ALTER FUNCTION "public"."schedule_hourly_metrics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."schedule_hourly_metrics"() IS 'Schedules the hourly metrics computation';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_ai_suggestion"("p_ticket_id" "uuid", "p_content" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_message_id uuid;
  v_system_user_id uuid;
BEGIN
  -- Get or create the system user ID
  v_system_user_id := get_or_create_ai_system_user();

  -- Ensure we have a system user
  IF v_system_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to get or create AI system user';
  END IF;

  INSERT INTO ticket_messages (
    ticket_id,
    content,
    message_type,
    confidence_score,
    metadata,
    user_id
  )
  VALUES (
    p_ticket_id,
    p_content,
    'auto_suggestion',
    p_confidence_score,
    p_metadata,
    v_system_user_id
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;


ALTER FUNCTION "public"."store_ai_suggestion"("p_ticket_id" "uuid", "p_content" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "suggested_response" "text" NOT NULL,
    "confidence_score" real NOT NULL,
    "system_user_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "feedback" "text"
);


ALTER TABLE "public"."ai_suggestions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ai_suggestion"("p_suggestion_id" "uuid", "p_suggested_response" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") RETURNS SETOF "public"."ai_suggestions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    UPDATE ai_suggestions 
    SET suggested_response = p_suggested_response,
        confidence_score = p_confidence_score,
        metadata = p_metadata,
        status = 'completed',
        updated_at = NOW()
    WHERE id = p_suggestion_id
    AND status = 'pending'
    RETURNING *;
END;
$$;


ALTER FUNCTION "public"."update_ai_suggestion"("p_suggestion_id" "uuid", "p_suggested_response" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_ai_suggestion"("p_suggestion_id" "uuid", "p_suggested_response" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") IS 'Updates a Processing suggestion with actual AI-generated content';



CREATE OR REPLACE FUNCTION "public"."update_ai_suggestion_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_suggestion_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  EXECUTE format('
    UPDATE conversations 
    SET last_message_at = $1 
    WHERE id = $2
  ') USING NEW.created_at, NEW.conversation_id;
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."update_conversation_last_message_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_kb_article_embedding"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  embedding vector(1536);
begin
  -- Get embedding from OpenAI (this will be handled by our backend)
  new.embedding := new.embedding;
  
  return new;
end;
$$;


ALTER FUNCTION "public"."update_kb_article_embedding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_kb_articles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_kb_articles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tag_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.tags
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.tags
        SET usage_count = GREATEST(0, usage_count - 1)
        WHERE id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_tag_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ticket_resolution_time"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolution_time = NOW() - NEW.created_at;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ticket_resolution_time"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_ts TIMESTAMPTZ;
BEGIN
    -- Use clock_timestamp() instead of CURRENT_TIMESTAMP for more accurate timing
    current_ts := clock_timestamp();
    NEW.updated_at := current_ts;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    "id" integer NOT NULL,
    "hash" "text" NOT NULL,
    "created_at" bigint
);


ALTER TABLE "drizzle"."__drizzle_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "drizzle"."__drizzle_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "drizzle"."__drizzle_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "drizzle"."__drizzle_migrations_id_seq" OWNED BY "drizzle"."__drizzle_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."aggregated_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_type" "text" NOT NULL,
    "metric_name" "text" NOT NULL,
    "metric_value" numeric NOT NULL,
    "dimension" "text",
    "dimension_value" "text",
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "clock_timestamp"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."aggregated_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."aggregated_metrics" IS 'Stores hourly aggregated metrics for feedback analysis';



CREATE TABLE IF NOT EXISTS "public"."ai_feedback_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "suggestion_id" "uuid" NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "feedback_type" "public"."feedback_type" NOT NULL,
    "agent_response" "text",
    "feedback_reason" "text",
    "time_to_feedback" interval,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_feedback_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_suggestion_errors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "error_message" "text",
    "context" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_suggestion_errors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_suggestion_queue" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "error" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_suggestion_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."ai_suggestion_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_suggestion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_suggestion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "message_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "file_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unread" boolean DEFAULT true,
    CONSTRAINT "chat_messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'file'::"text", 'codeSnippet'::"text"]))),
    CONSTRAINT "chat_messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['agent'::"text", 'customer'::"text", 'ai'::"text"])))
);

ALTER TABLE ONLY "public"."chat_messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "customer_id" "uuid" NOT NULL,
    "agent_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ticket_id" "uuid",
    CONSTRAINT "conversations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'closed'::"text"])))
);

ALTER TABLE ONLY "public"."conversations" REPLICA IDENTITY FULL;


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kb_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" "text" NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."kb_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by_id" "uuid"
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(30) NOT NULL,
    "color" character varying(7) NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_id" "uuid" NOT NULL,
    CONSTRAINT "tags_color_check" CHECK ((("color")::"text" ~ '^#[0-9a-fA-F]{6}$'::"text")),
    CONSTRAINT "tags_name_check" CHECK (("length"(("name")::"text") >= 2))
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_message_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "content_type" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_message_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."ticket_message_attachments" IS 'Stores file attachments associated with ticket messages';



CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message_type" character varying(50) DEFAULT 'user_message'::character varying,
    "confidence_score" double precision,
    "metadata" "jsonb",
    "is_ai_generated" boolean DEFAULT false,
    CONSTRAINT "ticket_messages_confidence_score_check" CHECK ((("confidence_score" >= (0)::double precision) AND ("confidence_score" <= (1)::double precision))),
    CONSTRAINT "ticket_messages_message_type_check" CHECK ((("message_type")::"text" = ANY (ARRAY[('user_message'::character varying)::"text", ('auto_suggestion'::character varying)::"text"])))
);


ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ticket_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."ticket_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_number" integer DEFAULT "nextval"('"public"."ticket_number_seq"'::"regclass") NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "assigned_to_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_response_at" timestamp with time zone,
    "resolution_time" interval,
    "satisfaction_rating" integer,
    "satisfaction_feedback" "text",
    CONSTRAINT "tickets_satisfaction_rating_check" CHECK ((("satisfaction_rating" >= 1) AND ("satisfaction_rating" <= 5)))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ticket_metrics" AS
 WITH "monthly_stats" AS (
         SELECT "date_trunc"('month'::"text", "tickets"."created_at") AS "month",
            "count"(*) AS "total_tickets",
            "count"(*) FILTER (WHERE ("tickets"."status" = ANY (ARRAY['new'::"text", 'open'::"text", 'pending'::"text"]))) AS "open_tickets",
            "avg"((EXTRACT(epoch FROM ("tickets"."first_response_at" - "tickets"."created_at")) / (3600)::numeric)) FILTER (WHERE ("tickets"."first_response_at" IS NOT NULL)) AS "avg_response_time_hours",
            "avg"("tickets"."satisfaction_rating") FILTER (WHERE ("tickets"."satisfaction_rating" IS NOT NULL)) AS "avg_satisfaction",
            "count"(*) FILTER (WHERE ("tickets"."satisfaction_rating" IS NOT NULL)) AS "rated_tickets"
           FROM "public"."tickets"
          GROUP BY ("date_trunc"('month'::"text", "tickets"."created_at"))
        )
 SELECT "monthly_stats"."month",
    "monthly_stats"."total_tickets",
    "monthly_stats"."open_tickets",
    "round"("monthly_stats"."avg_response_time_hours", 2) AS "avg_response_time_hours",
    "round"(("monthly_stats"."avg_satisfaction" * (20)::numeric), 1) AS "satisfaction_percentage",
    "lag"("monthly_stats"."total_tickets") OVER (ORDER BY "monthly_stats"."month") AS "prev_total_tickets",
    "lag"("monthly_stats"."open_tickets") OVER (ORDER BY "monthly_stats"."month") AS "prev_open_tickets",
    "lag"("monthly_stats"."avg_response_time_hours") OVER (ORDER BY "monthly_stats"."month") AS "prev_avg_response_time",
    "lag"("monthly_stats"."avg_satisfaction") OVER (ORDER BY "monthly_stats"."month") AS "prev_avg_satisfaction"
   FROM "monthly_stats"
  ORDER BY "monthly_stats"."month" DESC;


ALTER TABLE "public"."ticket_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_tags" (
    "ticket_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_id" "uuid" NOT NULL
);


ALTER TABLE "public"."ticket_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "drizzle"."__drizzle_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"drizzle"."__drizzle_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "drizzle"."__drizzle_migrations"
    ADD CONSTRAINT "__drizzle_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aggregated_metrics"
    ADD CONSTRAINT "aggregated_metrics_metric_type_metric_name_dimension_dimens_key" UNIQUE ("metric_type", "metric_name", "dimension", "dimension_value", "period_start");



ALTER TABLE ONLY "public"."aggregated_metrics"
    ADD CONSTRAINT "aggregated_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_feedback_events"
    ADD CONSTRAINT "ai_feedback_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_suggestion_errors"
    ADD CONSTRAINT "ai_suggestion_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_suggestion_queue"
    ADD CONSTRAINT "ai_suggestion_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_suggestion_requests"
    ADD CONSTRAINT "ai_suggestion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversation_ticket_unique" UNIQUE ("ticket_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kb_articles"
    ADD CONSTRAINT "kb_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_auth_user_id_unique" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_message_attachments"
    ADD CONSTRAINT "ticket_message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_notes"
    ADD CONSTRAINT "ticket_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("ticket_id", "tag_id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_ai_suggestion_queue_status" ON "public"."ai_suggestion_queue" USING "btree" ("status");



CREATE INDEX "idx_ai_suggestion_queue_ticket_id" ON "public"."ai_suggestion_queue" USING "btree" ("ticket_id");



CREATE INDEX "idx_ai_suggestion_requests_status" ON "public"."ai_suggestion_requests" USING "btree" ("status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_ai_suggestion_requests_ticket" ON "public"."ai_suggestion_requests" USING "btree" ("ticket_id");



CREATE INDEX "idx_ai_suggestions_system_user_id" ON "public"."ai_suggestions" USING "btree" ("system_user_id");



CREATE INDEX "idx_ai_suggestions_ticket_id" ON "public"."ai_suggestions" USING "btree" ("ticket_id");



CREATE INDEX "idx_chat_messages_conversation_id" ON "public"."chat_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_chat_messages_sender_id" ON "public"."chat_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_chat_messages_unread" ON "public"."chat_messages" USING "btree" ("unread") WHERE ("unread" = true);



CREATE INDEX "idx_conversations_agent_id" ON "public"."conversations" USING "btree" ("agent_id");



CREATE INDEX "idx_conversations_customer_id" ON "public"."conversations" USING "btree" ("customer_id");



CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_ticket_id" ON "public"."conversations" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_message_attachments_ticket_message_id" ON "public"."ticket_message_attachments" USING "btree" ("ticket_message_id");



CREATE INDEX "kb_articles_embedding_idx" ON "public"."kb_articles" USING "ivfflat" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "ticket_messages_ticket_id_idx" ON "public"."ticket_messages" USING "btree" ("ticket_id");



CREATE INDEX "ticket_messages_user_id_idx" ON "public"."ticket_messages" USING "btree" ("user_id");



CREATE INDEX "ticket_notes_created_by_id_idx" ON "public"."ticket_notes" USING "btree" ("created_by_id");



CREATE INDEX "ticket_notes_ticket_id_idx" ON "public"."ticket_notes" USING "btree" ("ticket_id");



CREATE INDEX "tickets_assigned_to_id_idx" ON "public"."tickets" USING "btree" ("assigned_to_id");



CREATE INDEX "tickets_customer_id_idx" ON "public"."tickets" USING "btree" ("customer_id");



CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "public"."tickets" USING "btree" ("ticket_number");



CREATE OR REPLACE TRIGGER "after_message_insert" AFTER INSERT ON "public"."ticket_messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_customer_message"();



CREATE OR REPLACE TRIGGER "after_ticket_insert" AFTER INSERT ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_ticket"();



CREATE OR REPLACE TRIGGER "create_conversation_for_ticket" AFTER INSERT ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."create_ticket_conversation"();



CREATE OR REPLACE TRIGGER "kb_article_embedding_trigger" BEFORE INSERT OR UPDATE ON "public"."kb_articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_kb_article_embedding"();



CREATE OR REPLACE TRIGGER "on_new_ticket" AFTER INSERT ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_ticket"();



CREATE OR REPLACE TRIGGER "trigger_ticket_created" AFTER INSERT ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."on_ticket_created"();



CREATE OR REPLACE TRIGGER "trigger_update_ai_suggestion_requests_updated_at" BEFORE UPDATE ON "public"."ai_suggestion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_suggestion_requests_updated_at"();



CREATE OR REPLACE TRIGGER "update_ai_feedback_events_updated_at" BEFORE UPDATE ON "public"."ai_feedback_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_timestamp" AFTER INSERT ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message_timestamp"();



CREATE OR REPLACE TRIGGER "update_kb_articles_updated_at" BEFORE UPDATE ON "public"."kb_articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_kb_articles_updated_at"();



CREATE OR REPLACE TRIGGER "update_resolution_time_trigger" BEFORE UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_resolution_time"();



ALTER TABLE ONLY "public"."ai_feedback_events"
    ADD CONSTRAINT "ai_feedback_events_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ai_feedback_events"
    ADD CONSTRAINT "ai_feedback_events_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "public"."ai_suggestions"("id");



ALTER TABLE ONLY "public"."ai_feedback_events"
    ADD CONSTRAINT "ai_feedback_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id");



ALTER TABLE ONLY "public"."ai_suggestion_queue"
    ADD CONSTRAINT "ai_suggestion_queue_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id");



ALTER TABLE ONLY "public"."ai_suggestion_requests"
    ADD CONSTRAINT "ai_suggestion_requests_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."ticket_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_suggestion_requests"
    ADD CONSTRAINT "ai_suggestion_requests_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id");



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."ticket_messages"("id");



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_system_user_id_fkey" FOREIGN KEY ("system_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "fk_tickets_assigned_to" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "fk_tickets_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kb_articles"
    ADD CONSTRAINT "kb_articles_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_message_attachments"
    ADD CONSTRAINT "ticket_message_attachments_ticket_message_id_fkey" FOREIGN KEY ("ticket_message_id") REFERENCES "public"."ticket_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_notes"
    ADD CONSTRAINT "ticket_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_notes"
    ADD CONSTRAINT "ticket_notes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Admins and assigned agents can create feedback events" ON "public"."ai_feedback_events" FOR INSERT WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ai_feedback_events"."ticket_id") AND ("t"."assigned_to_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
           FROM ("public"."user_roles" "ur"
             JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
          WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'agent'::"text")))))))));



CREATE POLICY "Admins and assigned agents can view feedback events" ON "public"."ai_feedback_events" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ai_feedback_events"."ticket_id") AND ("t"."assigned_to_id" = "auth"."uid"()) AND ("t"."assigned_to_id" <> "t"."customer_id") AND ("ai_feedback_events"."agent_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
           FROM ("public"."user_roles" "ur"
             JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
          WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'agent'::"text")))))))));



CREATE POLICY "Admins can access all suggestions" ON "public"."ai_suggestions" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete any note" ON "public"."ticket_notes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text")))));



CREATE POLICY "Admins can delete feedback events" ON "public"."ai_feedback_events" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins can manage all feedback" ON "public"."ai_feedback_events" USING ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "p"."id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE ("r"."name" = 'admin'::"text")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "p"."id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE ("r"."name" = 'admin'::"text"))));



CREATE POLICY "Admins can manage metrics" ON "public"."aggregated_metrics" USING ("public"."is_admin"());



CREATE POLICY "Admins can update any note" ON "public"."ticket_notes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text")))));



CREATE POLICY "Admins can update feedback events" ON "public"."ai_feedback_events" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can view all notes" ON "public"."ticket_notes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text")))));



CREATE POLICY "Admins can view all suggestions" ON "public"."ai_suggestions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."tickets" "t"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "t"."assigned_to_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("t"."id" = "ai_suggestions"."ticket_id") AND ("r"."name" = 'admin'::"text")))));



CREATE POLICY "Agents and admins can create messages" ON "public"."ticket_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))));



CREATE POLICY "Agents and admins can create notes" ON "public"."ticket_notes" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))) AND ("created_by_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."tickets"
  WHERE ("tickets"."id" = "ticket_notes"."ticket_id")))));



CREATE POLICY "Agents and admins can view all messages" ON "public"."ticket_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))));



CREATE POLICY "Agents can delete their own notes" ON "public"."ticket_notes" FOR DELETE TO "authenticated" USING ((("created_by_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = 'agent'::"text"))))));



CREATE POLICY "Agents can manage feedback for assigned tickets" ON "public"."ai_feedback_events" USING ((EXISTS ( SELECT 1
   FROM ((("public"."tickets" "t"
     JOIN "public"."profiles" "p" ON (("t"."assigned_to_id" = "p"."id")))
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "p"."id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("t"."id" = "ai_feedback_events"."ticket_id") AND ("r"."name" = 'agent'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((("public"."tickets" "t"
     JOIN "public"."profiles" "p" ON (("t"."assigned_to_id" = "p"."id")))
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "p"."id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("t"."id" = "ai_feedback_events"."ticket_id") AND ("r"."name" = 'agent'::"text")))));



CREATE POLICY "Agents can update suggestions for assigned tickets" ON "public"."ai_suggestions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ai_suggestions"."ticket_id") AND ("t"."assigned_to_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ai_suggestions"."ticket_id") AND ("t"."assigned_to_id" = "auth"."uid"())))));



CREATE POLICY "Agents can update their own notes" ON "public"."ticket_notes" FOR UPDATE TO "authenticated" USING ((("created_by_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = 'agent'::"text")))))) WITH CHECK ((("created_by_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = 'agent'::"text"))))));



CREATE POLICY "Agents can view all non-private notes and their own private not" ON "public"."ticket_notes" FOR SELECT TO "authenticated" USING ((((("visibility" = 'private'::"text") AND ("created_by_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"())))) OR ("visibility" = ANY (ARRAY['team'::"text", 'public'::"text"]))) AND (EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = 'agent'::"text"))))));



CREATE POLICY "Agents can view metrics" ON "public"."aggregated_metrics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))));



CREATE POLICY "Agents can view suggestions for assigned tickets" ON "public"."ai_suggestions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."tickets" "t"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "t"."assigned_to_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("t"."id" = "ai_suggestions"."ticket_id") AND ("r"."name" = 'agent'::"text")))));



CREATE POLICY "Allow authenticated users to create attachments" ON "public"."ticket_message_attachments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."ticket_messages" "tm"
     JOIN "public"."profiles" "p" ON (("p"."id" = "tm"."user_id")))
  WHERE (("tm"."id" = "ticket_message_attachments"."ticket_message_id") AND ("p"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "Allow authenticated users to create messages" ON "public"."ticket_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("p"."id" = "ticket_messages"."user_id")))));



CREATE POLICY "Allow users to delete attachments" ON "public"."ticket_message_attachments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."ticket_messages" "tm"
     JOIN "public"."profiles" "p" ON (("p"."id" = "tm"."user_id")))
  WHERE (("tm"."id" = "ticket_message_attachments"."ticket_message_id") AND ("p"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "Allow users to view attachments" ON "public"."ticket_message_attachments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."ticket_messages" "tm"
     JOIN "public"."tickets" "t" ON (("t"."id" = "tm"."ticket_id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "t"."customer_id")))
  WHERE (("tm"."id" = "ticket_message_attachments"."ticket_message_id") AND (("p"."auth_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM (("public"."profiles" "up"
             JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "up"."id")))
             JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
          WHERE (("up"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))))))));



CREATE POLICY "Allow users to view messages" ON "public"."ticket_messages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can view conversations" ON "public"."conversations" FOR SELECT USING (true);



CREATE POLICY "Anyone can view messages" ON "public"."chat_messages" FOR SELECT USING (true);



CREATE POLICY "Customers can create messages on their tickets" ON "public"."ticket_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_messages"."ticket_id") AND ("t"."customer_id" IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."auth_user_id" = "auth"."uid"())))))));



CREATE POLICY "Customers can view messages on their tickets" ON "public"."ticket_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_messages"."ticket_id") AND ("t"."customer_id" IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."auth_user_id" = "auth"."uid"())))))));



CREATE POLICY "Customers can view suggestions for their tickets" ON "public"."ai_suggestions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ai_suggestions"."ticket_id") AND ("t"."customer_id" = "auth"."uid"())))));



CREATE POLICY "Only admins can delete articles" ON "public"."kb_articles" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."user_roles"
     JOIN "public"."roles" ON (("user_roles"."role_id" = "roles"."id")))
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("roles"."name" = 'admin'::"text")))));



CREATE POLICY "Only agents and admins can create articles" ON "public"."kb_articles" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_roles"
     JOIN "public"."roles" ON (("user_roles"."role_id" = "roles"."id")))
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("roles"."name" = ANY (ARRAY['agent'::"text", 'admin'::"text"]))))));



CREATE POLICY "Only author, agents, and admins can update articles" ON "public"."kb_articles" FOR UPDATE USING ((("author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."user_roles"
     JOIN "public"."roles" ON (("user_roles"."role_id" = "roles"."id")))
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("roles"."name" = ANY (ARRAY['agent'::"text", 'admin'::"text"])))))));



CREATE POLICY "System user can insert suggestions" ON "public"."ai_suggestions" FOR INSERT WITH CHECK (("system_user_id" = "auth"."uid"()));



CREATE POLICY "System user can manage feedback" ON "public"."ai_feedback_events" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "ai_feedback_events"."agent_id") AND ("p"."email" = 'ai-system@internal.zendesk-replica.com'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "ai_feedback_events"."agent_id") AND ("p"."email" = 'ai-system@internal.zendesk-replica.com'::"text")))));



CREATE POLICY "System user can manage suggestions" ON "public"."ai_suggestions" USING (("system_user_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."email" = 'ai-system@internal.zendesk-replica.com'::"text")))) WITH CHECK (("system_user_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."email" = 'ai-system@internal.zendesk-replica.com'::"text"))));



CREATE POLICY "Ticket owners can view public notes and agent responses" ON "public"."ticket_notes" FOR SELECT TO "authenticated" USING ((("visibility" = 'public'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."tickets" "t"
     JOIN "public"."profiles" "p" ON (("t"."customer_id" = "p"."id")))
  WHERE (("t"."id" = "ticket_notes"."ticket_id") AND ("p"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "Ticket tags are viewable by authenticated users" ON "public"."ticket_tags" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Ticket tags can be created by ticket owners or agents" ON "public"."ticket_tags" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "p"."id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['admin'::"text", 'agent'::"text"])) AND ("ticket_tags"."created_by_id" = "p"."id") AND ("ticket_tags"."ticket_id" IN ( SELECT "t"."id"
           FROM "public"."tickets" "t"
          WHERE ("t"."id" = "ticket_tags"."ticket_id")))))));



CREATE POLICY "Ticket tags can be deleted by ticket owners or agents" ON "public"."ticket_tags" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."profiles" "p"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "p"."id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("p"."auth_user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['admin'::"text", 'agent'::"text"])) AND ("ticket_tags"."ticket_id" IN ( SELECT "t"."id"
           FROM "public"."tickets" "t"
          WHERE ("t"."id" = "ticket_tags"."ticket_id")))))));



CREATE POLICY "Users can create attachments for their messages" ON "public"."ticket_message_attachments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."ticket_messages" "tm"
     JOIN "public"."tickets" "t" ON (("tm"."ticket_id" = "t"."id")))
  WHERE (("tm"."id" = "ticket_message_attachments"."ticket_message_id") AND (("t"."customer_id" = "auth"."uid"()) OR ("t"."assigned_to_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM ("public"."user_roles" "ur"
             JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
          WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text")))))))));



CREATE POLICY "Users can create messages for tickets they have access to" ON "public"."ticket_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'agent'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_messages"."ticket_id") AND ("t"."customer_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete their own attachments" ON "public"."ticket_message_attachments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."ticket_messages" "tm"
  WHERE (("tm"."id" = "ticket_message_attachments"."ticket_message_id") AND ("tm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own messages" ON "public"."ticket_messages" FOR DELETE TO "authenticated" USING ((("user_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_messages"."ticket_id") AND ("t"."customer_id" IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."auth_user_id" = "auth"."uid"()))))))));



CREATE POLICY "Users can delete their own messages or any message if they are " ON "public"."ticket_messages" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'agent'::"text"))))));



CREATE POLICY "Users can read messages for tickets they have access to" ON "public"."ticket_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'agent'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_messages"."ticket_id") AND ("t"."customer_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their own messages" ON "public"."ticket_messages" FOR UPDATE TO "authenticated" USING (("user_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"())))) WITH CHECK (("user_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view attachments of messages they can see" ON "public"."ticket_message_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."ticket_messages" "tm"
     JOIN "public"."tickets" "t" ON (("tm"."ticket_id" = "t"."id")))
  WHERE (("tm"."id" = "ticket_message_attachments"."ticket_message_id") AND (("t"."customer_id" = "auth"."uid"()) OR ("t"."assigned_to_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM ("public"."user_roles" "ur"
             JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
          WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text")))))))));



CREATE POLICY "Users can view public articles or any if agent" ON "public"."kb_articles" FOR SELECT USING (("is_public" OR (EXISTS ( SELECT 1
   FROM ("public"."user_roles"
     JOIN "public"."roles" ON (("user_roles"."role_id" = "roles"."id")))
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("roles"."name" = ANY (ARRAY['agent'::"text", 'admin'::"text"])))))));



ALTER TABLE "public"."aggregated_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_feedback_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_suggestion_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_ai_suggestion_queue" ON "public"."ai_suggestion_queue" FOR INSERT TO "service_role" WITH CHECK (true);



ALTER TABLE "public"."kb_articles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_ai_suggestion_queue" ON "public"."ai_suggestion_queue" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "temp_debug_message_sending" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT true
   FROM (("public"."profiles" "p"
     LEFT JOIN "public"."conversations" "c" ON (("c"."id" = "chat_messages"."conversation_id")))
     LEFT JOIN "public"."tickets" "t" ON (("t"."id" = "c"."ticket_id")))
  WHERE (( SELECT true
           FROM ( SELECT "auth"."uid"() AS "auth_user_id",
                    "p"."auth_user_id" AS "sender_auth_id",
                    "chat_messages"."conversation_id",
                    "chat_messages"."sender_type",
                    "chat_messages"."message_type",
                        CASE
                            WHEN ("t"."customer_id" = "p"."id") THEN true
                            ELSE false
                        END AS "is_customer_conversation") "debug_info"
          WHERE true) OR true))));



ALTER TABLE "public"."ticket_message_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_ai_suggestion_queue" ON "public"."ai_suggestion_queue" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "update_processing_suggestions" ON "public"."ai_suggestions" FOR UPDATE USING ((("suggested_response" = 'Processing...'::"text") AND ("status" = 'pending'::"text"))) WITH CHECK (("suggested_response" <> 'Processing...'::"text"));



COMMENT ON POLICY "update_processing_suggestions" ON "public"."ai_suggestions" IS 'Allows updating Processing suggestions with actual content';





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


CREATE PUBLICATION "supabase_realtime_messages_publication" WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION "supabase_realtime_messages_publication" OWNER TO "supabase_admin";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."aggregated_metrics";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ai_feedback_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ai_suggestion_errors";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ai_suggestion_queue";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ai_suggestion_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ai_suggestions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."app_settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."kb_articles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."roles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tags";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ticket_message_attachments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ticket_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ticket_notes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."ticket_tags";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tickets";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_roles";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";


























































































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_hourly_metrics"("start_time" timestamp with time zone, "end_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_hourly_metrics"("start_time" timestamp with time zone, "end_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_hourly_metrics"("start_time" timestamp with time zone, "end_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_ticket_conversation"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_ticket_conversation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_ticket_conversation"() TO "service_role";



GRANT ALL ON TABLE "public"."ticket_notes" TO "anon";
GRANT ALL ON TABLE "public"."ticket_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_notes" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_ticket_note"("p_ticket_id" "uuid", "p_content" "text", "p_created_by_id" "uuid", "p_is_agent_or_admin" boolean, "p_visibility" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_ticket_note"("p_ticket_id" "uuid", "p_content" "text", "p_created_by_id" "uuid", "p_is_agent_or_admin" boolean, "p_visibility" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_ticket_note"("p_ticket_id" "uuid", "p_content" "text", "p_created_by_id" "uuid", "p_is_agent_or_admin" boolean, "p_visibility" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_customer_message"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_customer_message"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_customer_message"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agent_unread_messages_count"("agent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agent_unread_messages_count"("agent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_unread_messages_count"("agent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_chat_attachment_url"("file_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_chat_attachment_url"("file_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_chat_attachment_url"("file_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_ai_system_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_ai_system_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_ai_system_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_similar_articles"("_article_id" "uuid", "_match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_similar_articles"("_article_id" "uuid", "_match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_similar_articles"("_article_id" "uuid", "_match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ticket_ai_suggestions"("p_ticket_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_ticket_ai_suggestions"("p_ticket_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ticket_ai_suggestions"("p_ticket_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_ticket"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_ticket"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_ticket"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_customer"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_customer"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_customer"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_conversation_messages_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_conversation_messages_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_conversation_messages_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_kb_articles"("query_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_kb_articles"("query_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_kb_articles"("query_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_kb_articles"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_kb_articles"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_kb_articles"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_kb_articles"("query_text" "text", "match_threshold" double precision, "match_count" integer, "service_role_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_kb_articles"("query_text" "text", "match_threshold" double precision, "match_count" integer, "service_role_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_kb_articles"("query_text" "text", "match_threshold" double precision, "match_count" integer, "service_role_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_customer_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_customer_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_customer_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_ticket_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_ticket_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_ticket_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_ticket_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_ticket_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_ticket_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_customer_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_customer_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_customer_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."schedule_hourly_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_hourly_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_hourly_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_ai_suggestion"("p_ticket_id" "uuid", "p_content" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."store_ai_suggestion"("p_ticket_id" "uuid", "p_content" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_ai_suggestion"("p_ticket_id" "uuid", "p_content" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



GRANT ALL ON TABLE "public"."ai_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."ai_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_suggestions" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_suggestion"("p_suggestion_id" "uuid", "p_suggested_response" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_suggestion"("p_suggestion_id" "uuid", "p_suggested_response" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_suggestion"("p_suggestion_id" "uuid", "p_suggested_response" "text", "p_confidence_score" double precision, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_suggestion_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_suggestion_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_suggestion_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_kb_article_embedding"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_kb_article_embedding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_kb_article_embedding"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_kb_articles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_kb_articles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_kb_articles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tag_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tag_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tag_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ticket_resolution_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_resolution_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_resolution_time"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";


















GRANT ALL ON TABLE "public"."aggregated_metrics" TO "anon";
GRANT ALL ON TABLE "public"."aggregated_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."aggregated_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."ai_feedback_events" TO "anon";
GRANT ALL ON TABLE "public"."ai_feedback_events" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_feedback_events" TO "service_role";



GRANT ALL ON TABLE "public"."ai_suggestion_errors" TO "anon";
GRANT ALL ON TABLE "public"."ai_suggestion_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_suggestion_errors" TO "service_role";



GRANT ALL ON TABLE "public"."ai_suggestion_queue" TO "anon";
GRANT ALL ON TABLE "public"."ai_suggestion_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_suggestion_queue" TO "service_role";



GRANT ALL ON TABLE "public"."ai_suggestion_requests" TO "anon";
GRANT ALL ON TABLE "public"."ai_suggestion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_suggestion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."kb_articles" TO "anon";
GRANT ALL ON TABLE "public"."kb_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."kb_articles" TO "service_role";



GRANT ALL ON TABLE "public"."logs" TO "anon";
GRANT ALL ON TABLE "public"."logs" TO "authenticated";
GRANT ALL ON TABLE "public"."logs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_message_attachments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_message_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_message_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_metrics" TO "anon";
GRANT ALL ON TABLE "public"."ticket_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_tags" TO "anon";
GRANT ALL ON TABLE "public"."ticket_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_tags" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
