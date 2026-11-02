-- Eenhana School League database schema
-- Run this in the SQL Editor of a NEW Supabase project.
-- Do not run this in another project's database.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  group_name text not null check (group_name in ('U15 Boys', 'U15 Girls')),
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  full_name text not null,
  shirt_number integer,
  position text,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  match_date date not null,
  kickoff time,
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'postponed', 'cancelled')),
  competition text not null check (competition in ('U15 Boys', 'U15 Girls')),
  venue text default 'Eenhana',
  created_at timestamptz not null default now(),
  constraint different_teams check (home_team_id <> away_team_id)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_name text not null,
  minute integer check (minute is null or minute between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_starting boolean not null default true,
  position_slot text,
  created_at timestamptz not null default now(),
  constraint unique_player_per_match unique (match_id, player_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  competition text not null check (competition in ('U15 Boys', 'U15 Girls')),
  match_id uuid references public.matches(id) on delete set null,
  published boolean not null default false,
  published_at date default current_date,
  created_at timestamptz not null default now()
);

create index if not exists matches_date_idx on public.matches(match_date, kickoff);
create index if not exists goals_match_idx on public.goals(match_id);
create index if not exists goals_team_idx on public.goals(team_id);
create index if not exists players_team_idx on public.players(team_id);
create index if not exists lineups_match_idx on public.match_lineups(match_id, team_id);

-- Security helper: only a user explicitly listed in admin_users may write league data.
create or replace function public.is_league_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

alter table public.admin_users enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.match_lineups enable row level security;
alter table public.matches enable row level security;
alter table public.goals enable row level security;
alter table public.reports enable row level security;

-- Public read access. Admin roster is intentionally not publicly readable.
create policy "public can read teams" on public.teams for select to anon, authenticated using (true);
create policy "public can read players" on public.players for select to anon, authenticated using (true);
create policy "public can read matches" on public.matches for select to anon, authenticated using (true);
create policy "public can read goals" on public.goals for select to anon, authenticated using (true);
create policy "public can read match lineups" on public.match_lineups for select to anon, authenticated using (true);
create policy "public can read published reports" on public.reports for select to anon, authenticated using (published = true);

-- Admin-only writes.
create policy "admins manage teams" on public.teams for all to authenticated using (public.is_league_admin()) with check (public.is_league_admin());
create policy "admins manage players" on public.players for all to authenticated using (public.is_league_admin()) with check (public.is_league_admin());
create policy "admins manage matches" on public.matches for all to authenticated using (public.is_league_admin()) with check (public.is_league_admin());
create policy "admins manage goals" on public.goals for all to authenticated using (public.is_league_admin()) with check (public.is_league_admin());
create policy "admins manage match lineups" on public.match_lineups for all to authenticated using (public.is_league_admin()) with check (public.is_league_admin());
create policy "admins manage reports" on public.reports for all to authenticated using (public.is_league_admin()) with check (public.is_league_admin());

-- An admin can see their own admin membership row. Only service-role SQL/admin can add members.
create policy "admins can read own membership" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- Restrict table privileges explicitly. RLS is the authorization boundary;
-- the browser's public key is not an admin credential.
revoke all on public.admin_users from anon, authenticated;
revoke all on public.teams, public.players, public.matches, public.goals, public.match_lineups, public.reports from anon, authenticated;
revoke all on function public.is_league_admin() from public, anon;
grant execute on function public.is_league_admin() to authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.teams, public.players, public.matches, public.goals, public.match_lineups to anon, authenticated;
grant select on public.reports to anon, authenticated;
grant select on public.admin_users to authenticated;
grant insert, update, delete on public.teams, public.players, public.matches, public.goals, public.match_lineups, public.reports to authenticated;
