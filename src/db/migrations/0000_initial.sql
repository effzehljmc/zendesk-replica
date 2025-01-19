CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "auth_user_id" uuid NOT NULL,
  "email" text NOT NULL,
  "full_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_number" serial NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'open',
  "priority" text NOT NULL DEFAULT 'medium',
  "customer_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "assigned_to_id" uuid REFERENCES "profiles"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "kb_articles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "content" text NOT NULL,
  "author_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS tickets_customer_id_idx ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS tickets_assigned_to_id_idx ON tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS kb_articles_author_id_idx ON kb_articles(author_id);

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_key ON profiles(auth_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON profiles(email);
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_key ON roles(name);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_ticket_number_key ON tickets(ticket_number); 