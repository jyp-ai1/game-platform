"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PlatformGameCard } from "@/components/platform-game-card";
import { detailHrefForCatalogSlug, REPLAY_CARD_CTA } from "@/lib/game-catalog";

/**
 * Sprint 17 Step 5 — search UI + simple title/tag filter (no search infra).
 */
export function HomeSearchStub({ games }: { games: Game[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return games
      .filter((g) => {
        const hay = `${g.title} ${g.slug} ${g.tags.join(" ")}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 8);
  }, [games, q]);

  return (
    <section
      className="border-t border-white/5 py-5 sm:py-6"
      data-testid="home-search-stub"
      aria-label="게임 검색"
    >
      <Container>
        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-card/60 px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="게임 제목 · 태그 검색"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="검색어"
          />
          <Link href="/search" className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
            전체
          </Link>
        </div>
        {q.trim() ? (
          filtered.length > 0 ? (
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
              {filtered.map((game) => (
                <PlatformGameCard
                  key={game.id}
                  game={game}
                  className="min-w-[220px] max-w-[260px] shrink-0"
                  actions={{
                    primary: { label: REPLAY_CARD_CTA, href: detailHrefForCatalogSlug(game.slug) },
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">검색 결과 없음</p>
          )
        ) : null}
      </Container>
    </section>
  );
}
