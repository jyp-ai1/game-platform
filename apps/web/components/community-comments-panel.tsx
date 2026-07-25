"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { useState, type FormEvent } from "react";

import { listComments, postComment, type CommunityComment } from "@/lib/community-store";

export function CommunityCommentsPanel({ games }: { games: Game[] }) {
  const [gameSlug, setGameSlug] = useState(games[0]?.slug ?? "");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<CommunityComment[]>(() => listComments());

  function refresh() {
    setItems(listComments());
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    postComment(gameSlug, message);
    setMessage("");
    refresh();
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h2 className="font-semibold">Comments</h2>
      <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
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
          {items.slice(0, 5).map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-white/5 bg-background/40 px-3 py-2 text-sm"
            >
              <span className="text-xs text-primary">{c.gameSlug}</span>
              <p className="mt-0.5">{c.message}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
