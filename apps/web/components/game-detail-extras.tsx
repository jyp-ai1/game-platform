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

export function GameDetailShare({ gameSlug, title }: { gameSlug: string; title: string }) {
  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : `/games/${gameSlug}`;
    const text = `Re:Play · ${title}`;
    if (navigator.share) {
      await navigator.share({ title: text, url });
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="w-full rounded-2xl border border-white/10 bg-card/50 py-3 text-sm font-medium backdrop-blur transition-colors hover:border-primary/30"
    >
      Share
    </button>
  );
}
