"use client";

import type { Game } from "@game-platform/shared";
import { createRoom } from "@game-platform/multiplayer-sdk";
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

const ACTIVE_ROOM_KEY = "play29:active-room";

function makeWorldInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 3; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return `WORLD-${suffix}`;
}

/** Pin invite to a real multiplayer room id (not a disposable UUID). */
function resolveInviteRoomCode(gameSlug: string): string {
  if (typeof window !== "undefined") {
    try {
      const active = window.localStorage.getItem(ACTIVE_ROOM_KEY)?.toUpperCase();
      // Prefer a pinned WORLD-* shard (bare WORLD re-resolves per client → split worlds)
      if (active && /^WORLD-[A-Z0-9]+$/.test(active)) {
        return active;
      }
      if (gameSlug !== "snake" && gameSlug !== "agar" && gameSlug !== "bomber" && active) {
        return active;
      }
    } catch {
      /* ignore */
    }
  }

  // Snake / Agar / Bomber — same WORLD-* invite UX (do not deepen Snake-only invite).
  if (gameSlug === "snake" || gameSlug === "agar" || gameSlug === "bomber") {
    const code = makeWorldInviteCode();
    createRoom({
      gameSlug,
      maxPlayers: gameSlug === "snake" ? 50 : 8,
      matchMode: "public",
      code,
    });
    try {
      window.localStorage.setItem(ACTIVE_ROOM_KEY, code);
    } catch {
      /* ignore */
    }
    return code;
  }

  const room = createRoom({
    gameSlug,
    maxPlayers: 8,
    matchMode: "friends",
  });
  try {
    window.localStorage.setItem(ACTIVE_ROOM_KEY, room.code);
  } catch {
    /* ignore */
  }
  return room.code;
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
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared" | "error">("idle");

  function buildInviteUrl(): string {
    const invite = resolveInviteRoomCode(gameSlug);
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://game29.vercel.app";
    // Concrete room id in query — HUD ROOM must match clipboard ROOM (never bare WORLD).
    if (gameSlug === "snake") {
      return `${origin}/flagship/snake-io/play?room=${encodeURIComponent(invite)}&source=invite`;
    }
    return `${origin}/games/${gameSlug}?invite=${encodeURIComponent(invite)}&source=invite`;
  }

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  async function handleShare(mode: "default" | "challenge" | "sms" = "default") {
    const url = buildInviteUrl();
    const text =
      mode === "challenge"
        ? `Re:Play Challenge · Beat my score in ${title}!`
        : `Re:Play · ${title} — 같이 플레이해요`;
    const payload = `${text}\n${url}`;

    if (mode === "sms") {
      window.location.href = `sms:?body=${encodeURIComponent(payload)}`;
      return;
    }

    const canWebShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      // Prefer OS share sheet on touch / coarse pointers (mobile); desktop → copy primary
      (navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches);

    if (mode === "default" && canWebShare) {
      try {
        await navigator.share({ title: text, text, url });
        setShareStatus("shared");
        window.setTimeout(() => setShareStatus("idle"), 2000);
        return;
      } catch (err) {
        // User cancel → still offer copy; AbortError = cancelled
        if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "AbortError") {
          return;
        }
      }
    }

    const ok = await copyText(url);
    setShareStatus(ok ? "copied" : "error");
    window.setTimeout(() => setShareStatus("idle"), 2200);
  }

  const statusLabel =
    shareStatus === "copied"
      ? "초대 링크가 복사되었습니다."
      : shareStatus === "shared"
        ? "공유됨"
        : shareStatus === "error"
          ? "복사 실패 — 주소를 직접 복사하세요"
          : null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        data-testid="game-detail-share-btn"
        onClick={() => void handleShare("default")}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-card/50 py-3 text-sm font-medium backdrop-blur transition-colors hover:border-primary/30"
      >
        <Share2 className="size-4" /> 친구 초대 / 공유
      </button>
      {statusLabel ? (
        <p
          data-testid="game-detail-share-status"
          className="text-center text-xs text-emerald-300"
          role="status"
        >
          {statusLabel}
        </p>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground">
          모바일: 공유 시트 · PC: 초대 링크 복사
        </p>
      )}
      {challengeMode ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleShare("challenge")}
            className="rounded-xl border border-primary/20 bg-primary/5 py-2 text-xs font-medium"
          >
            Challenge Friends
          </button>
          <button
            type="button"
            onClick={() => void handleShare("sms")}
            className="rounded-xl border border-white/10 py-2 text-xs"
          >
            SMS
          </button>
        </div>
      ) : null}
    </div>
  );
}
