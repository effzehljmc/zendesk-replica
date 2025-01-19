-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS "kb_articles";
DROP TABLE IF EXISTS "tickets";
DROP TABLE IF EXISTS "user_roles";
DROP TABLE IF EXISTS "roles";
DROP TABLE IF EXISTS "profiles";

-- Recreate tables with proper constraints
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "auth_user_id" uuid NOT NULL,
  "email" text NOT NULL,
  "full_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT profiles_auth_user_id_key UNIQUE ("auth_user_id"),
  CONSTRAINT profiles_email_key UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT roles_name_key UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT fk_user_roles_user FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_number" serial NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'open',
  "priority" text NOT NULL DEFAULT 'medium',
  "customer_id" uuid NOT NULL,
  "assigned_to_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT tickets_ticket_number_key UNIQUE ("ticket_number"),
  CONSTRAINT fk_tickets_customer FOREIGN KEY ("customer_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT fk_tickets_assigned_to FOREIGN KEY ("assigned_to_id") REFERENCES "profiles"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "kb_articles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "content" text NOT NULL,
  "author_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT fk_kb_articles_author FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS tickets_customer_id_idx ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS tickets_assigned_to_id_idx ON tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS kb_articles_author_id_idx ON kb_articles(author_id); 