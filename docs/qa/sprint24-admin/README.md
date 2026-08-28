# Sprint 24 — Admin Moderation Evidence

Lightweight ops at `/admin/moderation` (auth via existing `ADMIN_SECRET`).

- Users list (Supabase CRM when configured)
- Games status + honest play counts
- Comments + bug reports (localStorage client read)
- Creator review queue: approve → publish, reject, unpublish
- API: `/api/admin/moderation/creator-games`

Smoke: `node tools/qa/sprint24-admin.mjs`
