import type { Game } from "@game-platform/shared";
import { Container, SectionTitle, cn } from "@game-platform/ui";

import { GameCard } from "./game-card";

interface GameCarouselProps {
  title: string;
  description?: string;
  games: Game[];
  hotSlugs?: Set<string>;
  large?: boolean;
}

export function GameCarousel({
  title,
  description,
  games,
  hotSlugs,
  large = false,
}: GameCarouselProps) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 border-b",
        large ? "py-6 sm:py-10" : "py-8 sm:py-10"
      )}
    >
      <Container>
        <SectionTitle
          title={title}
          description={description || undefined}
          className={large ? "[&_h2]:text-xl [&_h2]:sm:text-2xl" : undefined}
        />
        <div
          className={cn(
            "scrollbar-hide mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2",
            large && "mt-8 gap-5"
          )}
        >
          {games.map((game) => (
            <div
              key={game.id}
              className={cn(
                "w-[calc((100%-1rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)]",
                large && "w-[72vw] sm:w-[280px]"
              )}
            >
              <GameCard game={game} isHot={hotSlugs?.has(game.slug)} compact={large} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
