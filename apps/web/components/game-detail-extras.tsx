"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { Share2, ThumbsDown, Heart, Flag } from "lucide-react";
import { useCallback, useState, useSyncExternalStore, type FormEvent } from "react";

import { StarRatingPanel } from "@/components/community-ratings-panel";
import {
  isCommentDisliked,
  isCommentLiked,
  listCommentsForGame,
  postComment,
  reportComment,
  toggleCommentDislike,
  toggleCommentLike,
} from "@/lib/community-store";
import { subscribeLiveData } from "@/lib/live-data-bus";

export function GameDetailComments({ gameSlug }: { gameSlug: string }) {
  const [message, setMessage] = useState("");
  const [, bump] = useState(0);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const refresh = useCallback(() => bump((n) => n + 1), []);
  const comments = listCommentsForGame(gameSlug, "recent").slice(0, 5);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    postComment(gameSlug, message);
    setMessage("");
    refresh();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h3 className="font-semibold">Comments</h3>
      <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
        <textarea
          className="w-full rounded-xl border bg-background/60 px-3 py-2 text-sm backdrop-blur"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave a comment…"
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
      {comments.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {comments.map((c) => {
            const liked = isCommentLiked(c.id);
            const disliked = isCommentDisliked(c.id);
            return (
              <li key={c.id} className="rounded-lg border border-white/5 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">{c.author}</p>
                <p>{c.message}</p>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <button
                    type="button"
                    className={liked ? "text-red-400" : ""}
                    onClick={() => {
                      toggleCommentLike(c.id);
                      refresh();
                    }}
                  >
                    <Heart className="mr-0.5 inline size-3" fill={liked ? "currentColor" : "none"} />
                    {c.likes}
                  </button>
                  <button
                    type="button"
                    className={disliked ? "text-amber-400" : ""}
                    onClick={() => {
                      toggleCommentDislike(c.id);
                      refresh();
                    }}
                  >
                    <ThumbsDown className="inline size-3" />
                  </button>
                  <button type="button" onClick={() => reportComment(c.id)}>
                    <Flag className="inline size-3" /> Report
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Be the first to comment.</p>
      )}
      <Link href="/community" className="mt-3 inline-block text-xs text-primary hover:underline">
        View all in Community →
      </Link>
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

export function GameDetailShare({
  gameSlug,
  title,
  challengeMode = false,
}: {
  gameSlug: string;
  title: string;
  challengeMode?: boolean;
}) {
  async function handleShare(mode: "default" | "challenge" | "kakao" | "sms" = "default") {
    const url = typeof window !== "undefined" ? window.location.href : `/games/${gameSlug}`;
    const text =
      mode === "challenge"
        ? `Re:Play Challenge · Beat my score in ${title}!`
        : `Re:Play · ${title}`;

    if (mode === "kakao") {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      return;
    }
    if (mode === "sms") {
      window.location.href = `sms:?body=${encodeURIComponent(`${text}\n${url}`)}`;
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: text, url, text });
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => handleShare("default")}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-card/50 py-3 text-sm font-medium backdrop-blur transition-colors hover:border-primary/30"
      >
        <Share2 className="size-4" /> Share
      </button>
      {challengeMode ? (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleShare("challenge")}
            className="rounded-xl border border-primary/20 bg-primary/5 py-2 text-xs font-medium"
          >
            Challenge Friends
          </button>
          <button
            type="button"
            onClick={() => handleShare("kakao")}
            className="rounded-xl border border-white/10 py-2 text-xs"
          >
            Kakao
          </button>
          <button
            type="button"
            onClick={() => handleShare("sms")}
            className="rounded-xl border border-white/10 py-2 text-xs"
          >
            SMS
          </button>
        </div>
      ) : null}
    </div>
  );
}
