-- =============================================
-- Tabelas
-- =============================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  is_admin boolean default false not null,
  created_at timestamptz default now() not null
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  stage text not null default 'group',
  group_name text,
  home_team text not null,
  away_team text not null,
  match_date timestamptz not null,
  home_score integer,
  away_score integer,
  status text not null default 'scheduled',
  created_at timestamptz default now() not null,
  constraint matches_status_check check (status in ('scheduled', 'live', 'finished'))
);

create table public.picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  home_score integer not null,
  away_score integer not null,
  points integer,
  created_at timestamptz default now() not null,
  unique(user_id, match_id)
);

-- =============================================
-- Row Level Security
-- =============================================

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.picks enable row level security;

-- Profiles: leitura pública entre autenticados, escrita apenas próprio registro
create policy "profiles_select"
  on public.profiles for select
  to authenticated using (true);

create policy "profiles_insert"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Matches: leitura para autenticados, escrita apenas via service role (sync automático)
create policy "matches_select"
  on public.matches for select
  to authenticated using (true);

-- Picks: leitura para autenticados
-- Escrita apenas para o próprio usuário E enquanto o jogo ainda não está bloqueado
create policy "picks_select"
  on public.picks for select
  to authenticated using (true);

create policy "picks_insert"
  on public.picks for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.match_date > now() + interval '10 minutes'
    )
  );

create policy "picks_update"
  on public.picks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.match_date > now() + interval '10 minutes'
    )
  );

-- =============================================
-- Trigger: criar profile ao registrar usuário
-- =============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- Função: leaderboard
-- =============================================

create or replace function public.get_leaderboard()
returns table (
  user_id uuid,
  username text,
  display_name text,
  total_points bigint,
  picks_count bigint,
  exact_scores bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    p.id as user_id,
    p.username,
    p.display_name,
    coalesce(sum(pk.points), 0) as total_points,
    count(pk.id) as picks_count,
    count(case when pk.points = 3 then 1 end) as exact_scores
  from public.profiles p
  left join public.picks pk on pk.user_id = p.id
  group by p.id, p.username, p.display_name
  order by total_points desc, exact_scores desc;
$$;
