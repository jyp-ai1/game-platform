-- Global World — raise multiplayer room cap to 50 players

alter table public.mp_rooms drop constraint if exists mp_rooms_max_players_check;
alter table public.mp_rooms add constraint mp_rooms_max_players_check check (max_players between 2 and 50);
