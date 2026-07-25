"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import Link from "next/link";

export function GameDetailComments({ gameSlug }: { gameSlug: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h3 className="font-semibold">Comments</h3>
      <p className="mt-2 text-sm text-muted-foreground">첫 댓글을 남겨보세요.</p>
      <textarea
        className="mt-3 w-full rounded-xl border bg-background/60 px-3 py-2 text-sm backdrop-blur"
        rows={2}
        placeholder="이 게임 어땠나요?"
        aria-label="댓글 작성"
        disabled
      />
      <Button className="mt-2" size="sm" disabled>
        Post (Soon)
      </Button>
    </div>
  );
}

export function GameDetailRating({ gameSlug }: { gameSlug: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h3 className="font-semibold">Rating</h3>
      <div className="mt-2 flex gap-1 text-2xl text-muted-foreground">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className="hover:text-amber-400" disabled aria-label={`${n} stars`}>
            ★
          </button>
        ))}
      </div>
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
