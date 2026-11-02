-- Eenhana School League: match timeline events
-- Run once in Supabase SQL Editor after the original schema.sql.
create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  player_name text,
  event_type text not null check (event_type in ('goal','penalty','own_goal','yellow_card','red_card','substitution')),
  minute integer check (minute is null or (minute between 1 and 120)),
  details text,
  created_at timestamptz not null default now()
);
create index if not exists match_events_match_idx on public.match_events(match_id, minute);
create index if not exists match_events_team_idx on public.match_events(team_id);
alter table public.match_events enable row level security;
drop policy if exists "public can read match events" on public.match_events;
create policy "public can read match events" on public.match_events for select to anon, authenticated using (true);
drop policy if exists "admins manage match events" on public.match_events;
create policy "admins manage match events" on public.match_events for all to authenticated using (public.is_league_admin()) with check (public.is_league_admin());
revoke all on public.match_events from anon, authenticated;
grant select on public.match_events to anon, authenticated;
grant insert, update, delete on public.match_events to authenticated;

-- Goal-like events update the match score automatically. For an own goal,
-- select the team that receives the goal in the Team field.
create or replace function public.apply_match_event_score()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_scoring boolean := false;
  new_scoring boolean := false;
begin
  if tg_op <> 'INSERT' then old_scoring := old.event_type in ('goal','penalty','own_goal'); end if;
  if tg_op <> 'DELETE' then new_scoring := new.event_type in ('goal','penalty','own_goal'); end if;
  if old_scoring and (tg_op = 'DELETE' or old.match_id is distinct from new.match_id or old.team_id is distinct from new.team_id or old.event_type is distinct from new.event_type) then
    update public.matches set
      home_score = case when home_team_id = old.team_id then greatest(coalesce(home_score,0)-1,0) else home_score end,
      away_score = case when away_team_id = old.team_id then greatest(coalesce(away_score,0)-1,0) else away_score end
    where id = old.match_id;
  end if;
  if new_scoring and (tg_op = 'INSERT' or old.match_id is distinct from new.match_id or old.team_id is distinct from new.team_id or old.event_type is distinct from new.event_type) then
    update public.matches set
      home_score = case when home_team_id = new.team_id then coalesce(home_score,0)+1 else home_score end,
      away_score = case when away_team_id = new.team_id then coalesce(away_score,0)+1 else away_score end,
      status = 'completed'
    where id = new.match_id;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;
drop trigger if exists match_event_score_trigger on public.match_events;
create trigger match_event_score_trigger
after insert or update or delete on public.match_events
for each row execute function public.apply_match_event_score();
