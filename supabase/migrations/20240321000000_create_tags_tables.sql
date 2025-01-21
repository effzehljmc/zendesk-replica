-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all existing policies first
DO $$ 
BEGIN
    -- Drop policies for tags table
    DROP POLICY IF EXISTS "Tags are viewable by authenticated users" ON public.tags;
    DROP POLICY IF EXISTS "Tags can be created by agents and admins" ON public.tags;
    DROP POLICY IF EXISTS "Tags can be deleted by agents and admins" ON public.tags;
    
    -- Drop policies for ticket_tags table
    DROP POLICY IF EXISTS "Ticket tags are viewable by authenticated users" ON public.ticket_tags;
    DROP POLICY IF EXISTS "Ticket tags can be created by ticket owners or agents" ON public.ticket_tags;
    DROP POLICY IF EXISTS "Ticket tags can be deleted by ticket owners or agents" ON public.ticket_tags;
    
    -- Drop existing tables if they exist
    DROP TABLE IF EXISTS public.ticket_tags;
    DROP TABLE IF EXISTS public.tags;
    
    -- Disable RLS first to avoid any issues
    ALTER TABLE IF EXISTS public.tags DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.ticket_tags DISABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Fix auth_user_id column type in profiles table
ALTER TABLE profiles 
  ALTER COLUMN auth_user_id TYPE uuid USING auth_user_id::uuid;

-- Create helper function to get authenticated user id as UUID
CREATE OR REPLACE FUNCTION auth.user_id() 
RETURNS UUID 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN CAST(auth.uid() AS UUID);
END;
$$;

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(30) NOT NULL CHECK (length(name) >= 2),
    color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    UNIQUE(name)
);

-- Create ticket_tags junction table
CREATE TABLE IF NOT EXISTS public.ticket_tags (
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, tag_id)
);

-- Enable RLS and create policies for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by authenticated users"
    ON public.tags
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Tags can be created by agents and admins"
    ON public.tags
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            WITH role_check AS (
                SELECT 
                    p.id as profile_id,
                    p.auth_user_id,
                    r.name as role_name,
                    auth.uid() as current_auth_uid,
                    auth.jwt() as current_jwt,
                    (SELECT CASE 
                        WHEN auth.role() = 'authenticated' THEN true 
                        ELSE false 
                    END) as is_authenticated,
                    (SELECT CASE 
                        WHEN p.auth_user_id = auth.uid()::uuid THEN true 
                        ELSE false 
                    END) as auth_id_matches
                FROM profiles p
                INNER JOIN user_roles ur ON ur.user_id = p.id
                INNER JOIN roles r ON r.id = ur.role_id
                WHERE p.auth_user_id = auth.uid()::uuid
            )
            SELECT 1 FROM role_check
            WHERE role_name IN ('admin', 'agent')
            AND is_authenticated = true
            AND auth_id_matches = true
        )
        AND created_by_id = (
            SELECT id 
            FROM profiles 
            WHERE auth_user_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Tags can be deleted by agents and admins"
    ON public.tags
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            INNER JOIN user_roles ur ON ur.user_id = p.id
            INNER JOIN roles r ON r.id = ur.role_id
            WHERE p.auth_user_id = auth.uid()::uuid
            AND r.name IN ('admin', 'agent')
        )
    );

-- Enable RLS and create policies for ticket_tags
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket tags are viewable by authenticated users"
    ON public.ticket_tags
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Ticket tags can be created by ticket owners or agents"
    ON public.ticket_tags
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles p
            INNER JOIN user_roles ur ON ur.user_id = p.id
            INNER JOIN roles r ON r.id = ur.role_id
            WHERE p.auth_user_id = auth.uid()::uuid
            AND r.name IN ('admin', 'agent')
            AND created_by_id = p.id
            AND (
                ticket_id IN (
                    SELECT t.id
                    FROM public.tickets t
                    WHERE t.id = ticket_id
                )
            )
        )
    );

CREATE POLICY "Ticket tags can be deleted by ticket owners or agents"
    ON public.ticket_tags
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            INNER JOIN user_roles ur ON ur.user_id = p.id
            INNER JOIN roles r ON r.id = ur.role_id
            WHERE p.auth_user_id = auth.uid()::uuid
            AND r.name IN ('admin', 'agent')
            AND (
                ticket_id IN (
                    SELECT t.id
                    FROM public.tickets t
                    WHERE t.id = ticket_id
                )
            )
        )
    );

-- Create function to update tag usage statistics
CREATE OR REPLACE FUNCTION update_tag_usage()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for tag usage statistics
DROP TRIGGER IF EXISTS update_tag_usage_trigger ON public.ticket_tags;
CREATE TRIGGER update_tag_usage_trigger
AFTER INSERT OR DELETE ON public.ticket_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage();