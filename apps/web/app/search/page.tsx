import { Container, SectionTitle } from "@game-platform/ui";
import { SearchX } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { GameGrid } from "@/components/game-grid";
import { SearchBox } from "@/components/search-box";
import { searchGames } from "@/lib/search";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "검색",
};

export const revalidate = 60;

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const games = await getGames();
  const results = searchGames(games, q ?? "");

  return (
    <main className="flex flex-1 flex-col py-16">
      <Container>
        <SectionTitle
          title="게임 검색"
          description="게임명, 태그, 카테고리로 검색하세요."
        />

        <div className="mt-6">
          <SearchBox games={games} defaultValue={q ?? ""} />
        </div>

        <div className="mt-8">
          {q ? (
            <p className="mb-4 text-sm text-muted-foreground">
              &ldquo;{q}&rdquo; 검색 결과 {results.length}개
            </p>
          ) : null}
          {q && results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              message={`"${q}"에 대한 검색 결과가 없습니다. 다른 검색어를 시도해보세요.`}
            />
          ) : (
            <GameGrid games={results} />
          )}
        </div>
      </Container>
    </main>
  );
}
