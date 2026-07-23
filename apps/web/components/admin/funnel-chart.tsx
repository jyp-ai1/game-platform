const STEPS = [
  { key: "session", label: "Session" },
  { key: "game_start", label: "Game Start" },
  { key: "game_end", label: "Game Complete" },
  { key: "score_submit", label: "Score" },
  { key: "ranking_submit", label: "Ranking" },
  { key: "favorite", label: "Favorite" },
] as const;

export type FunnelData = Record<(typeof STEPS)[number]["key"], number>;

export function FunnelChart({ data }: { data: FunnelData }) {
  const max = Math.max(...STEPS.map((s) => data[s.key] ?? 0), 1);

  return (
    <div className="space-y-3">
      {STEPS.map((step, i) => {
        const value = data[step.key] ?? 0;
        const pct = max > 0 ? Math.round((value / max) * 100) : 0;
        const prev = i > 0 ? (data[STEPS[i - 1]!.key] ?? 0) : value;
        const conv = prev > 0 ? Math.round((value / prev) * 100) : 0;
        return (
          <div key={step.key}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{step.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {value.toLocaleString()}
                {i > 0 ? ` (${conv}%)` : ""}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
