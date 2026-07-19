import type { Game } from "@game-platform/shared";

import { EmptyState } from "./empty-state";
import { GameCard } from "./game-card";

export function GameGrid({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return <EmptyState message="아직 등록된 게임이 없습니다." />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
