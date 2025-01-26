create table if not exists public.ai_suggestions (
    id uuid primary key default uuid_generate_v4(),
    ticket_id uuid not null references tickets(id),
    content text not null,
    confidence_score float not null,
    status text not null default 'pending',
    kb_article_ids uuid[] default array[]::uuid[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.ai_suggestions enable row level security;

create policy "Enable read access for authenticated users" on public.ai_suggestions
    for select using (auth.role() = 'authenticated');

create policy "Enable insert for authenticated users" on public.ai_suggestions
    for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.ai_suggestions
    for update using (auth.role() = 'authenticated');

-- Add indexes
create index ai_suggestions_ticket_id_idx on public.ai_suggestions(ticket_id);
create index ai_suggestions_status_idx on public.ai_suggestions(status);

-- Add trigger for updated_at
create trigger set_updated_at
    before update on public.ai_suggestions
    for each row
    execute function common.set_updated_at();
