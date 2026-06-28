create table public.bracket_picks (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  picks jsonb not null default '{}',
  updated_at timestamptz default now() not null
);

alter table public.bracket_picks enable row level security;

create policy "bracket_picks_select"
  on public.bracket_picks for select
  to authenticated using (auth.uid() = user_id);

create policy "bracket_picks_insert"
  on public.bracket_picks for insert
  to authenticated with check (auth.uid() = user_id);

create policy "bracket_picks_update"
  on public.bracket_picks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.bracket_picks to authenticated;
