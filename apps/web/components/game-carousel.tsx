import type { Game } from "@game-platform/shared";
import { Container, SectionTitle } from "@game-platform/ui";

import { GameCard } from "./game-card";

interface GameCarouselProps {
  title: string;
  description?: string;
  games: Game[];
}

// Netflix-style horizontal-scroll row for the homepage's curated sections.
// Pure CSS (overflow-x + scroll-snap) — no client JS needed for the scroll
// itself, so this stays a Server Component like GameSection.
export function GameCarousel({ title, description, games }: GameCarouselProps) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section className="border-b py-10 sm:py-14">
      <Container>
        <SectionTitle title={title} description={description} />
        <div className="scrollbar-hide mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {games.map((game) => (
            <div key={game.id} className="w-64 shrink-0 snap-start sm:w-72">
              <GameCard game={game} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
