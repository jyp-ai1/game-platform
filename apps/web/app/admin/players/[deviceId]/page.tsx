import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayerAdminPanel } from "@/components/admin/player-admin-panel";
import { fetchPlayerCrmDetail } from "@/lib/supabase/ops-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  return { title: `Player ${deviceId.slice(0, 8)}…` };
}

export default async function AdminPlayerDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  const detail = await fetchPlayerCrmDetail(decodeURIComponent(deviceId));

  if (!detail?.player) {
    notFound();
  }

  const player = detail.player;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/players" className="text-sm text-primary hover:underline">
          ← Players
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{player.nickname ?? "Anonymous"}</h1>
        <p className="font-mono text-xs text-muted-foreground">{player.device_id}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-1 font-semibold">{player.status}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Plays</p>
          <p className="mt-1 font-semibold tabular-nums">{player.total_plays}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">First seen</p>
          <p className="mt-1 text-sm">{new Date(player.first_seen).toLocaleString("ko-KR")}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Last seen</p>
          <p className="mt-1 text-sm">{new Date(player.last_seen).toLocaleString("ko-KR")}</p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <PlayerAdminPanel detail={detail} />

        <div className="space-y-8">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-4 font-semibold">Best Scores</h2>
            <ul className="space-y-2 text-sm">
              {detail.scores.map((s) => (
                <li key={s.game_slug} className="flex justify-between">
                  <span>{s.game_slug}</span>
                  <span className="tabular-nums">{s.score.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-4 font-semibold">Activity Timeline</h2>
            <ul className="max-h-[400px] space-y-2 overflow-y-auto text-sm">
              {detail.activity.map((a, i) => (
                <li key={i} className="flex justify-between gap-4 border-b border-border/50 py-2">
                  <span>
                    <span className="font-medium">{a.event_type}</span>
                    {a.game_slug ? ` · ${a.game_slug}` : null}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("ko-KR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
