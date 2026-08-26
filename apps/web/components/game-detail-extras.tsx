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
  const stored = listCommentsForGame(gameSlug, "recent").slice(0, 5);
  /** Visible stub list when store is empty — Detail must show Comments. */
  const stubComments =
    stored.length === 0
      ? [
          {
            id: `stub-${gameSlug}-1`,
            gameSlug,
            author: "Nova",
            message: "친구랑 한 판 더 했어요. 월드가 살아있어요!",
            likes: 4,
            createdAt: new Date().toISOString(),
          },
          {
            id: `stub-${gameSlug}-2`,
            gameSlug,
            author: "Kai",
            message: "캐릭터·색상 고르고 바로 입장 — 흐름 좋음.",
            likes: 2,
            createdAt: new Date().toISOString(),
          },
        ]
      : [];
  const comments = stored.length > 0 ? stored : stubComments;
  const isStub = stored.length === 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    postComment(gameSlug, message);
    setMessage("");
    refresh();
  }

  return (
    <div
      className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur"
      data-testid="game-detail-comments"
    >
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
      <ul className="mt-4 space-y-2">
        {comments.map((c) => {
          const liked = !isStub && isCommentLiked(c.id);
          const disliked = !isStub && isCommentDisliked(c.id);
          return (
            <li key={c.id} className="rounded-lg border border-white/5 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">{c.author}</p>
              <p>{c.message}</p>
              <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                <button
                  type="button"
                  className={liked ? "text-red-400" : ""}
                  disabled={isStub}
                  onClick={() => {
                    if (isStub) return;
                    toggleCommentLike(c.id);
                    refresh();
                  }}
                >
                  <Heart className="mr-0.5 inline size-3" fill={liked ? "currentColor" : "none"} />
                  {c.likes}
                </button>
                {!isStub ? (
                  <>
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
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
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
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/games/${gameSlug}`
        : `/games/${gameSlug}`;
    const text =
      mode === "challenge"
        ? `Re:Play Challenge · Beat my score in ${title}!`
        : `Re:Play · ${title} — 같이 플레이해요`;

    try {
      if (mode === "kakao") {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        return;
      }
      if (mode === "sms") {
        window.location.href = `sms:?body=${encodeURIComponent(`${text}\n${url}`)}`;
        return;
      }
      // Prefer clipboard share-link (no full invite system).
      await navigator.clipboard.writeText(`${text}\n${url}`);
      if (mode === "default" && navigator.share) {
        try {
          await navigator.share({ title: text, url, text });
        } catch {
          /* user cancelled share sheet — clipboard already filled */
        }
      }
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        data-testid="game-detail-share-btn"
        onClick={() => handleShare("default")}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-card/50 py-3 text-sm font-medium backdrop-blur transition-colors hover:border-primary/30"
      >
        <Share2 className="size-4" /> 친구 초대 / 공유
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
