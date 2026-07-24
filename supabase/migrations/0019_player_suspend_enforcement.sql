-- Sprint 12 Phase 2 — enforce player suspend on score submit

create or replace function public.submit_score(
  p_game_slug text,
  p_device_id text,
  p_nickname text,
  p_score integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select p.status into v_status
  from public.players p
  where p.device_id = p_device_id;

  if v_status = 'suspended' then
    raise exception 'player_suspended';
  end if;

  insert into public.players (device_id, nickname, first_seen, last_seen)
  values (p_device_id, p_nickname, now(), now())
  on conflict (device_id) do update set
    nickname = excluded.nickname,
    last_seen = now(),
    updated_at = now();

  insert into public.scores (device_id, game_slug, nickname, score, updated_at)
  values (p_device_id, p_game_slug, p_nickname, p_score, now())
  on conflict (device_id, game_slug)
  do update set
    score = greatest(public.scores.score, excluded.score),
    nickname = excluded.nickname,
    updated_at = case
      when excluded.score > public.scores.score then now()
      else public.scores.updated_at
    end;

  perform public.refresh_leaderboards('all');
end;
$$;
