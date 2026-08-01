"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";

import { SnakeLiveGameCard } from "@/components/snake-live-game-card";

/** Home bottom — multiplayer games (Snake first; extensible grid). */
export function HomeMultiplayerSection({ snakeGame }: { snakeGame: Game | null }) {
  if (!snakeGame) return null;

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
          실시간으로 함께 플레이 · 더 많은 멀티 게임이 곧 추가됩니다
        </p>

        <div
          className="mt-5 grid gap-4 sm:max-w-md"
          data-testid="home-multiplayer-grid"
        >
          <SnakeLiveGameCard game={snakeGame} />
        </div>
      </Container>
    </section>
  );
}
