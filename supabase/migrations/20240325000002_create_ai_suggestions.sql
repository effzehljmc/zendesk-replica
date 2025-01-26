-- Create set_updated_at function if it doesn't exist
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create ai_suggestions table
create table if not exists ai_suggestions (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null,
  suggested_response text not null,
  confidence_score double precision not null,
  system_user_id uuid not null references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Add RLS policies
alter table ai_suggestions enable row level security;

create policy "Allow system user to insert ai_suggestions"
  on ai_suggestions for insert
  with check (auth.uid() = system_user_id);

create policy "Allow read access to ai_suggestions"
  on ai_suggestions for select
  using (true);

-- Add comment
comment on table ai_suggestions is 'Stores AI-generated responses to support tickets';

-- Create trigger for updated_at
create trigger set_ai_suggestions_updated_at
  before update on ai_suggestions
  for each row
  execute function set_updated_at();
