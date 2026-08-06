"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";

import { GameCard } from "@/components/game-card";
import { SnakeLiveGameCard } from "@/components/snake-live-game-card";

/** Home bottom — multiplayer games (Snake first; Agar + others). */
export function HomeMultiplayerSection({
  snakeGame,
  multiplayerGames = [],
}: {
  snakeGame: Game | null;
  /** Extra realtime/party games (e.g. agar), excluding snake. */
  multiplayerGames?: Game[];
}) {
  const extras = multiplayerGames.filter((g) => g.slug !== "snake");
  if (!snakeGame && extras.length === 0) return null;

  return (
    <section
      aria-labelledby="home-multiplayer-heading"
      className="border-t border-white/5 py-8 sm:py-10"
    >
      <Container>
        <h2 id="home-multiplayer-heading" className="text-xl font-bold">
          Multiplayer
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          실시간으로 함께 플레이 · Snake · Agar 외 멀티 게임
        </p>

        <div
          className="mt-5 grid gap-4 sm:grid-cols-2 sm:max-w-2xl"
          data-testid="home-multiplayer-grid"
        >
          {snakeGame ? <SnakeLiveGameCard game={snakeGame} /> : null}
          {extras.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </Container>
    </section>
  );
}
