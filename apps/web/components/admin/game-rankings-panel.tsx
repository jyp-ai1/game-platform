export function GameRankingsPanel({
  topGames,
  bottomGames,
}: {
  topGames: Array<{ slug: string; title: string; plays: number }>;
  bottomGames: Array<{ slug: string; title: string; plays: number }>;
}) {
  return (
    <section className="grid gap-8 xl:grid-cols-2">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-4 font-semibold">Top 5 Games</h2>
        <GameList games={topGames} />
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-4 font-semibold">Bottom 5 Games</h2>
        <GameList games={bottomGames} emptyLabel="데이터 수집 중" />
      </div>
    </section>
  );
}

function GameList({
  games,
  emptyLabel = "없음",
}: {
  games: Array<{ slug: string; title: string; plays: number }>;
  emptyLabel?: string;
}) {
  if (!games.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = games[0]?.plays ?? 1;

  return (
    <ul className="space-y-3">
      {games.map((game, i) => (
        <li key={game.slug}>
          <div className="mb-1 flex justify-between text-sm">
            <span>
              #{i + 1} {game.title}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {game.plays.toLocaleString()}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.max(4, Math.round((game.plays / max) * 100))}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
