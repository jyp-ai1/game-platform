import type { Game } from "@game-platform/shared";
import { Container, SectionTitle } from "@game-platform/ui";

import { GameGrid } from "./game-grid";

interface GameSectionProps {
  id?: string;
  title: string;
  description?: string;
  games: Game[];
  hotSlugs?: Set<string>;
}

export function GameSection({
  id,
  title,
  description,
  games,
  hotSlugs,
}: GameSectionProps) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section id={id} className="scroll-mt-14 py-20">
      <Container>
        <SectionTitle title={title} description={description} />
        <div className="mt-8">
          <GameGrid games={games} hotSlugs={hotSlugs} />
        </div>
      </Container>
    </section>
  );
}
