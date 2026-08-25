"use client";

import type { Game } from "@game-platform/shared";
import { REALTIME_GAMES } from "@game-platform/multiplayer-sdk";
import { Container } from "@game-platform/ui";

import { LiveMultiplayerGameCard } from "@/components/live-multiplayer-game-card";

/** Home bottom — realtime multiplayer games share one LIVE card pattern. */
export function HomeMultiplayerSection({
  snakeGame,
  multiplayerGames = [],
}: {
  snakeGame: Game | null;
  /** Extra realtime games (e.g. agar), excluding snake. */
  multiplayerGames?: Game[];
}) {
  const extras = multiplayerGames.filter(
    (g) => g.slug !== "snake" && REALTIME_GAMES.has(g.slug)
  );
  const cards: Game[] = [];
  if (snakeGame) cards.push(snakeGame);
  cards.push(...extras);

  if (cards.length === 0) return null;

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
          실시간으로 함께 플레이 · Snake · Agar · Bomber
        </p>

        <div
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:max-w-4xl"
          data-testid="home-multiplayer-grid"
        >
          {cards.map((game) => (
            <LiveMultiplayerGameCard key={game.id} game={game} />
          ))}
        </div>
      </Container>
    </section>
  );
}
