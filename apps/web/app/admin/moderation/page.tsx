import { ModerationDashboard } from "@/components/admin/moderation-dashboard";
import { mergeCatalogGames } from "@/lib/creator/creator-game-catalog";
import { getGames } from "@/lib/supabase/games";
import { searchPlayersCrm } from "@/lib/supabase/ops-server";

export const metadata = { title: "Moderation" };

export default async function AdminModerationPage() {
  const [games, usersResult] = await Promise.all([
    getGames({ includeComingSoon: true }),
    searchPlayersCrm("", null, 15, 0),
  ]);

  const catalogGames = mergeCatalogGames(games);
  const users =
    usersResult?.rows.map((r) => ({
      device_id: r.device_id,
      nickname: r.nickname,
      status: r.status,
      last_seen: r.last_seen,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moderation</h1>
        <p className="text-sm text-muted-foreground">
          Sprint 24 — users · games · comments · reports · creator publish
        </p>
      </div>
      <ModerationDashboard catalogGames={catalogGames} users={users} />
    </div>
  );
}
