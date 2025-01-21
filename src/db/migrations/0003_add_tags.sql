-- Create tags table
CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#94a3b8',
  "usage_count" integer NOT NULL DEFAULT 0,
  "last_used_at" timestamp with time zone,
  "created_by_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT tag_name_length CHECK (char_length(name) BETWEEN 2 AND 30),
  CONSTRAINT tag_name_format CHECK (name ~ '^[a-zA-Z0-9\s\-_]+$'),
  CONSTRAINT tag_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Create ticket_tags junction table
CREATE TABLE IF NOT EXISTS "ticket_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" uuid NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "created_by_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ticket_tag_unique UNIQUE ("ticket_id", "tag_id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);
CREATE INDEX IF NOT EXISTS tags_usage_count_idx ON tags(usage_count);
CREATE INDEX IF NOT EXISTS ticket_tags_ticket_id_idx ON ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_tags_tag_id_idx ON ticket_tags(tag_id);

-- Create function to enforce max tags per ticket
CREATE OR REPLACE FUNCTION check_max_tags_per_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM ticket_tags
    WHERE ticket_id = NEW.ticket_id
  ) >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 tags per ticket exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to enforce max unique tags
CREATE OR REPLACE FUNCTION check_max_unique_tags()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM tags
  ) >= 100 THEN
    RAISE EXCEPTION 'Maximum of 100 unique tags exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update tag usage statistics
CREATE OR REPLACE FUNCTION update_tag_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags 
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags 
    SET usage_count = usage_count - 1
    WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER check_max_tags_per_ticket_trigger
BEFORE INSERT ON ticket_tags
FOR EACH ROW
EXECUTE FUNCTION check_max_tags_per_ticket();

CREATE TRIGGER check_max_unique_tags_trigger
BEFORE INSERT ON tags
FOR EACH ROW
EXECUTE FUNCTION check_max_unique_tags();

CREATE TRIGGER update_tag_usage_stats_trigger
AFTER INSERT OR DELETE ON ticket_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage_stats(); 