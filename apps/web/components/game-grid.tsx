import type { Game } from "@game-platform/shared";

import { GameCard } from "./game-card";

export function GameGrid({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 등록된 게임이 없습니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
