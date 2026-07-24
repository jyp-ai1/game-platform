export type GameKpiRow = {
  slug: string;
  title: string;
  plays: number;
  finishes: number;
  favorites: number;
  resumes: number;
  retries: number;
  ranking_submits: number;
  avg_score: number;
  avg_play_time_sec: number;
  finish_rate_pct: number;
};

export function AllGamesKpiPanel({ rows }: { rows: GameKpiRow[] }) {
  if (!rows.length) {
    return (
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 font-semibold">All Games KPI (50)</h2>
        <p className="text-sm text-muted-foreground">
          데이터 수집 중 — 플레이 후 새로고침하세요.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-1 font-semibold">All Games KPI (50)</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Play · Finish · Retry · Favorite · Avg Time · Avg Score
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Game</th>
              <th className="pb-2 pr-4 font-medium tabular-nums">Play</th>
              <th className="pb-2 pr-4 font-medium tabular-nums">Finish</th>
              <th className="pb-2 pr-4 font-medium tabular-nums">Retry</th>
              <th className="pb-2 pr-4 font-medium tabular-nums">Favorite</th>
              <th className="pb-2 pr-4 font-medium tabular-nums">Avg Time</th>
              <th className="pb-2 font-medium tabular-nums">Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4">
                  <span className="font-medium">{row.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{row.slug}</span>
                </td>
                <td className="py-2 pr-4 tabular-nums">{row.plays.toLocaleString()}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {row.finishes.toLocaleString()}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({row.finish_rate_pct}%)
                  </span>
                </td>
                <td className="py-2 pr-4 tabular-nums">{row.retries.toLocaleString()}</td>
                <td className="py-2 pr-4 tabular-nums">{row.favorites.toLocaleString()}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {row.avg_play_time_sec > 0
                    ? `${row.avg_play_time_sec}s`
                    : "—"}
                </td>
                <td className="py-2 tabular-nums">{row.avg_score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
