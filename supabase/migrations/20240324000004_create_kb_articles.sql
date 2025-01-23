-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the kb_articles table
CREATE TABLE IF NOT EXISTS public.kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0),
    CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Add the embedding column separately
ALTER TABLE public.kb_articles ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for the embedding column for faster similarity searches
CREATE INDEX IF NOT EXISTS kb_articles_embedding_idx ON public.kb_articles USING ivfflat (embedding vector_cosine_ops);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_kb_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_kb_articles_updated_at
    BEFORE UPDATE ON public.kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_kb_articles_updated_at();

-- Enable Row Level Security
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

-- Create policies for kb_articles
-- View policy: Users can view public articles or any article if they are an agent
CREATE POLICY "Users can view public articles or any if agent"
    ON public.kb_articles
    FOR SELECT
    USING (
        is_public OR 
        EXISTS (
            SELECT 1 FROM user_roles
            JOIN roles ON user_roles.role_id = roles.id
            WHERE user_roles.user_id = auth.uid() 
            AND roles.name IN ('agent', 'admin')
        )
    );

-- Insert policy: Only agents and admins can create articles
CREATE POLICY "Only agents and admins can create articles"
    ON public.kb_articles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            JOIN roles ON user_roles.role_id = roles.id
            WHERE user_roles.user_id = auth.uid() 
            AND roles.name IN ('agent', 'admin')
        )
    );

-- Update policy: Only the author, agents, and admins can update articles
CREATE POLICY "Only author, agents, and admins can update articles"
    ON public.kb_articles
    FOR UPDATE
    USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles
            JOIN roles ON user_roles.role_id = roles.id
            WHERE user_roles.user_id = auth.uid() 
            AND roles.name IN ('agent', 'admin')
        )
    );

-- Delete policy: Only admins can delete articles
CREATE POLICY "Only admins can delete articles"
    ON public.kb_articles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            JOIN roles ON user_roles.role_id = roles.id
            WHERE user_roles.user_id = auth.uid() 
            AND roles.name = 'admin'
        )
    );

-- Grant appropriate permissions
GRANT ALL ON public.kb_articles TO authenticated;
GRANT ALL ON public.kb_articles TO service_role; 