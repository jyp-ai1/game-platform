"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Heart } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import {
  isCommentLiked,
  listComments,
  postComment,
  toggleCommentLike,
  type CommunityComment,
} from "@/lib/community-store";
import { ensureCommunityMockData } from "@/lib/community-mock";

export function CommunityCommentsPanel({ games }: { games: Game[] }) {
  const [gameSlug, setGameSlug] = useState(games[0]?.slug ?? "");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<CommunityComment[]>([]);
  const [, tick] = useState(0);

  useEffect(() => {
    ensureCommunityMockData();
    setItems(listComments());
  }, []);

  function refresh() {
    setItems(listComments());
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    postComment(gameSlug, message);
    setMessage("");
    refresh();
  }

  function handleLike(id: string) {
    toggleCommentLike(id);
    tick((n) => n + 1);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card/50 p-6 backdrop-blur">
      <h2 className="text-lg font-semibold">Comments</h2>
      <form className="mt-4 space-y-2" onSubmit={handleSubmit}>
        <select
          className="w-full rounded-xl border bg-background/60 px-3 py-2 text-sm"
          value={gameSlug}
          onChange={(e) => setGameSlug(e.target.value)}
          aria-label="게임"
        >
          {games.slice(0, 30).map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.title}
            </option>
          ))}
        </select>
        <textarea
          className="w-full rounded-xl border bg-background/60 px-3 py-2 text-sm"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="…"
          required
        />
        <Button type="submit" size="sm">
          Post
        </Button>
      </form>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.slice(0, 6).map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-white/5 bg-background/40 px-3 py-2 text-sm"
            >
              <div>
                <span className="text-xs text-primary">{c.gameSlug}</span>
                <p className="mt-0.5">{c.message}</p>
              </div>
              <button
                type="button"
                onClick={() => handleLike(c.id)}
                className={`shrink-0 ${isCommentLiked(c.id) ? "text-red-400" : "text-muted-foreground"}`}
                aria-label="Like"
              >
                <Heart className="size-4" fill={isCommentLiked(c.id) ? "currentColor" : "none"} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
