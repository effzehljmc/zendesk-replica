CREATE TABLE IF NOT EXISTS "settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  CONSTRAINT settings_key_key UNIQUE ("key")
); 