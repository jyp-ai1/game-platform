"use client";

import type { Game } from "@game-platform/shared";
import { Button, cn } from "@game-platform/ui";
import { Clock, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { searchGames } from "@/lib/search";
import { getGameBalanceMeta } from "@/lib/game-balance";
import { formatDifficulty } from "@/lib/difficulty";
import {
  clearRecentSearches,
  getRecentSearchesSnapshot,
  getServerRecentSearchesSnapshot,
  recordSearch,
  subscribeRecentSearches,
} from "@/lib/recent-searches";

const MAX_SUGGESTIONS = 6;

export function SearchBox({
  games,
  defaultValue = "",
}: {
  games: Game[];
  defaultValue?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);

  const recentSearches = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getServerRecentSearchesSnapshot
  );

  // Pure derived state via useMemo — no useEffect involved, so there's no
  // synchronous setState-in-effect to trip the react-hooks/set-state-in-effect
  // lint rule.
  const suggestions = useMemo(
    () => searchGames(games, query).slice(0, MAX_SUGGESTIONS),
    [games, query]
  );

  function commitSearch(term: string) {
    recordSearch(term);
  }

  return (
    <div className="relative w-full max-w-md">
      <form
        action="/search"
        className="flex gap-2"
        onSubmit={() => commitSearch(query)}
      >
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay so a click on a suggestion/recent-search item registers
            // before the dropdown unmounts.
            setTimeout(() => setIsOpen(false), 150);
          }}
          placeholder="게임 검색..."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <Button type="submit">검색</Button>
      </form>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          {query.trim() ? (
            suggestions.length > 0 ? (
              <ul className="flex flex-col">
                {suggestions.map((game) => {
                  const balance = getGameBalanceMeta(game.slug, game.difficulty);
                  return (
                  <li key={game.id}>
                    <Link
                      href={`/games/${game.slug}`}
                      onClick={() => commitSearch(query)}
                      className="block rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{game.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatDifficulty(game.difficulty)} · {balance.playTimeLabel}
                        {game.category ? ` · ${game.category.name}` : ""}
                      </span>
                    </Link>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                일치하는 게임이 없습니다.
              </p>
            )
          ) : recentSearches.length > 0 ? (
            <div>
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  최근 검색어
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  지우기
                </button>
              </div>
              <ul className="flex flex-col">
                {recentSearches.map((term) => (
                  <li key={term}>
                    <Link
                      href={`/search?q=${encodeURIComponent(term)}`}
                      onClick={() => commitSearch(term)}
                      className={cn(
                        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      )}
                    >
                      <Clock className="size-3.5 text-muted-foreground" />
                      {term}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="px-2 py-1">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                추천 검색
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Easy", "Quick", "Puzzle", "Arcade", "Board"].map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    onClick={() => commitSearch(term)}
                    className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
