# Rollback Guide — Re:Play

## App Rollback (Vercel)

Target: revert to last known-good deployment in **~15 seconds** (Vercel Instant Rollback).

### Option A — Vercel Dashboard

1. Vercel → Project `game29` → Deployments
2. Select previous **Production** deployment (e.g. pre-Sprint 11.5)
3. **Promote to Production**

### Option B — Git Revert + Push

```bash
# Find last good commit (example)
git log --oneline -10

# Revert merge or single commit
git revert <commit-sha> --no-edit
git push origin main
```

### Release Tags

| Tag | Purpose |
| --- | --- |
| `v1.11.0` | Sprint 11 release (Operations platform) |
| `v1.10.5` | Rollback target (pre-CMS/SEO, Sprint 10 stable) |

Create tags after PM PASS:

```bash
git tag -a v1.11.0 -m "Sprint 11: Operations platform"
git push origin v1.11.0
```

## Database Rollback

**Warning:** Rollback drops CMS/SEO data. Export audit log first if needed.

Apply in **reverse order** in Supabase SQL Editor.

### 0017 → remove audit columns

```sql
alter table public.cms_audit_log
  drop column if exists actor_ip,
  drop column if exists user_agent,
  drop column if exists before_state,
  drop column if exists after_state;
```

### 0016 → drop extended KPI

```sql
drop function if exists public.get_dashboard_kpis_extended(text);
-- Optional: keep get_dashboard_kpis from 0013
```

### 0015 → SEO platform

```sql
drop function if exists public.get_seo_audit_stats();
drop table if exists public.seo_lighthouse_runs;
drop table if exists public.seo_settings;
```

### 0014 → CMS

```sql
drop trigger if exists cms_game_visibility_sync on public.cms_game_visibility;
drop function if exists public.sync_cms_game_visibility();
drop function if exists public.get_cms_overview_stats();
drop table if exists public.cms_audit_log;
drop table if exists public.cms_game_visibility;
drop table if exists public.cms_featured_games;
drop table if exists public.cms_events;
drop table if exists public.cms_notices;
drop table if exists public.cms_banners;
alter table public.games drop constraint if exists games_status_check;
alter table public.games add constraint games_status_check
  check (status in ('ACTIVE', 'COMING_SOON', 'HIDDEN'));
```

### 0013 → Dashboard RPCs

```sql
drop function if exists public.get_top_games_analytics(text, integer);
drop function if exists public.get_activity_heatmap(integer);
drop function if exists public.get_cohort_retention(integer);
drop function if exists public.get_player_funnel(text);
drop function if exists public.get_dashboard_kpis(text);
drop function if exists public._period_since(text);
```

## Rollback Verification

After app rollback:

1. Home loads without CMS featured sections (if rolled back pre-11.4)
2. `/admin` works with prior feature set
3. No 500 from missing RPC (match DB rollback level to app version)

## Rollback SLA Target

| Step | Target |
| --- | --- |
| Vercel promote previous deploy | ~15 sec |
| Git revert + redeploy | ~3 min |
| DB rollback (manual SQL) | ~5 min |
