"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { StarRatingPanel } from "@/components/community-ratings-panel";
import { listComments, postComment } from "@/lib/community-store";

export function GameDetailComments({ gameSlug }: { gameSlug: string }) {
  const [message, setMessage] = useState("");
  const [posted, setPosted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    postComment(gameSlug, message);
    setMessage("");
    setPosted(true);
  }

  const recent = listComments().filter((c) => c.gameSlug === gameSlug).slice(0, 2);

  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h3 className="font-semibold">Comments</h3>
      <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
        <textarea
          className="w-full rounded-xl border bg-background/60 px-3 py-2 text-sm backdrop-blur"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="…"
          aria-label="댓글"
          required
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Post
        </button>
      </form>
      {posted ? <p className="mt-1 text-xs text-primary">OK</p> : null}
      {recent.map((c) => (
        <p key={c.id} className="mt-2 text-sm text-muted-foreground">
          {c.message}
        </p>
      ))}
    </div>
  );
}

export function GameDetailRating({ gameSlug }: { gameSlug: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <StarRatingPanel gameSlug={gameSlug} />
    </div>
  );
}

export function GameDetailNextGame({ next }: { next: Game | null }) {
  if (!next) return null;
  return (
    <Link
      href={`/games/${next.slug}`}
      className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
    >
      <div>
        <p className="text-xs font-medium uppercase text-primary">Next Game</p>
        <p className="mt-1 text-lg font-semibold">{next.title}</p>
      </div>
      <span className="text-sm font-medium">Play →</span>
    </Link>
  );
}
