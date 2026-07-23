import {
  fetchDailyStats,
  fetchTodayStats,
  fetchTopGames,
} from "@/lib/supabase/admin-server";

export const metadata = { title: "Dashboard" };

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function maskDeviceId(deviceId: string): string {
  if (deviceId.length <= 8) return "****";
  return `${deviceId.slice(0, 4)}…${deviceId.slice(-4)}`;
}

export default async function AdminDashboardPage() {
  const [today, daily, topGames] = await Promise.all([
    fetchTodayStats(),
    fetchDailyStats(14),
    fetchTopGames(10),
  ]);

  const maxPlayCount = topGames[0]?.play_count ?? 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          DAU · 플레이 · Funnel · Heatmap (T3에서 확장)
        </p>
      </div>

      {!today ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          SUPABASE_SECRET_KEY가 없거나 0010/0012 마이그레이션이 미적용입니다.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Today DAU" value={today.dau} />
          <StatCard label="Plays" value={today.session_starts} />
          <StatCard label="Score submits" value={today.score_submits} />
          <StatCard label="Saves created" value={today.save_created} />
          <StatCard label="Errors" value={today.errors} />
        </section>
      )}

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">인기 게임 TOP10</h2>
          <ul className="space-y-3">
            {topGames.map((game) => (
              <li key={game.slug}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{game.title}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {game.play_count.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.round((game.play_count / maxPlayCount) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">최근 플레이</h2>
          {today?.recent_plays?.length ? (
            <ul className="divide-y text-sm">
              {today.recent_plays.map((play, i) => (
                <li key={`${play.game_slug}-${i}`} className="flex justify-between py-2">
                  <span>
                    <span className="text-muted-foreground">
                      {maskDeviceId(play.device_id)}
                    </span>
                    {" · "}
                    {play.game_slug}
                  </span>
                  <span className="text-muted-foreground">{play.seconds_ago}s ago</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">아직 session_start 없음</p>
          )}
        </div>
      </section>

      {daily.length > 0 ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">Growth (14일)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">DAU</th>
                  <th className="py-2 pr-4">Plays</th>
                  <th className="py-2 pr-4">Scores</th>
                  <th className="py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.day} className="border-b border-border/50">
                    <td className="py-2 pr-4">{row.day}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.dau}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.session_starts}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.score_submits}</td>
                    <td className="py-2 tabular-nums">{row.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-dashed bg-card/50 p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">T3 예정: Player Funnel · Cohort Retention · Heatmap</p>
        <p className="mt-2">
          Session → Game Start → Game Complete → Ranking → Favorite
        </p>
      </section>
    </div>
  );
}
