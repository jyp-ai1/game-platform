import type { Metadata } from "next";

import { GamesDiscoveryBrowser } from "@/components/games-discovery-browser";
import { Container, SectionTitle } from "@game-platform/ui";

import { selectHotSlugs } from "@/lib/game-sections";
import { mergeLocalMvpGames } from "@/lib/local-mvp-games";
import { buildGamesListMetadata } from "@/lib/seo";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  ...buildGamesListMetadata(),
  title: "Search Games",
};

export const revalidate = 60;

/** Sprint 17 Step 5 — search UI stub (title/tag filter via Discover browser). */
export default async function SearchPage() {
  const games = mergeLocalMvpGames(await getGames());
  const hotSlugs = selectHotSlugs(games);

  return (
    <main className="flex flex-1 flex-col py-12">
      <section className="py-6">
        <Container>
          <SectionTitle
            title="검색"
            description="제목 · 태그로 필터 — 별도 검색 인프라 없음 (UI stub)."
          />
          <div className="mt-8">
            <GamesDiscoveryBrowser games={games} hotSlugs={hotSlugs} />
          </div>
        </Container>
      </section>
    </main>
  );
}
