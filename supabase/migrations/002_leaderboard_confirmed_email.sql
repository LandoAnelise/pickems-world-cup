drop function if exists public.get_leaderboard();

create function public.get_leaderboard()
returns table (
  user_id uuid,
  username text,
  display_name text,
  total_points bigint,
  picks_count bigint,
  correct_winners bigint,
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
    count(case when pk.points >= 1 then 1 end) as correct_winners,
    count(case when pk.points = 3 then 1 end) as exact_scores
  from public.profiles p
  inner join auth.users u on u.id = p.id
  left join public.picks pk on pk.user_id = p.id
  where u.email_confirmed_at is not null
  group by p.id, p.username, p.display_name
  order by total_points desc, exact_scores desc;
$$;
