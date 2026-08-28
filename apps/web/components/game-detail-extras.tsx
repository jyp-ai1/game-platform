"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { Share2, ThumbsDown, Heart, Flag } from "lucide-react";
import { useCallback, useState, useSyncExternalStore, type FormEvent } from "react";

import { StarRatingPanel } from "@/components/community-ratings-panel";
import { usePlayerAuth } from "@/components/auth-provider";
import {
  deleteOwnComment,
  isCommentDisliked,
  isCommentLiked,
  listCommentsForGame,
  moderateCommentStub,
  postComment,
  reportComment,
  toggleCommentDislike,
  toggleCommentLike,
} from "@/lib/community-store";
import {
  buildInvitePlayUrl,
  readInviteOrigin,
  resolveInviteRoomCode,
} from "@/lib/invite-link";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { getLastNickname } from "@game-platform/game-sdk";

export function GameDetailComments({ gameSlug }: { gameSlug: string }) {
  const { isAuthenticated, displayName, signIn, loading } = usePlayerAuth();
  const [message, setMessage] = useState("");
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [, bump] = useState(0);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const refresh = useCallback(() => bump((n) => n + 1), []);
  const stored = listCommentsForGame(gameSlug, "recent").slice(0, 8);
  /** Visible stub list when store is empty — Detail must show Comments. */
  const stubComments =
    stored.length === 0
      ? [
          {
            id: `stub-${gameSlug}-1`,
            gameSlug,
            author: "Nova",
            authorId: null as string | null,
            message: "친구랑 한 판 더 했어요. 월드가 살아있어요!",
            likes: 4,
            createdAt: new Date().toISOString(),
            moderated: false,
          },
          {
            id: `stub-${gameSlug}-2`,
            gameSlug,
            author: "Kai",
            authorId: null as string | null,
            message: "캐릭터·색상 고르고 바로 입장 — 흐름 좋음.",
            likes: 2,
            createdAt: new Date().toISOString(),
            moderated: false,
          },
        ]
      : [];
  const comments = stored.length > 0 ? stored : stubComments;
  const isStub = stored.length === 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      setGateMsg("댓글 작성은 로그인이 필요합니다.");
      return;
    }
    const nick = getLastNickname() || displayName || "Player";
    const mod = moderateCommentStub(message);
    if (!mod.ok) {
      setGateMsg(mod.reason ?? "댓글을 수정해 주세요.");
      return;
    }
    postComment(gameSlug, message, { author: nick, authorId: "self" });
    setMessage("");
    setGateMsg(null);
    refresh();
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  return (
    <div
      className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur"
      data-testid="game-detail-comments"
    >
      <h3 className="font-semibold">Comments</h3>
      {!loading && !isAuthenticated ? (
        <p className="mt-2 text-xs text-muted-foreground">
          작성은 로그인 후 가능합니다.{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => void signIn()}
            data-testid="comments-login-cta"
          >
            로그인
          </button>
          <span className="text-muted-foreground"> (LIVE OAuth: CEO HOLD)</span>
        </p>
      ) : null}
      <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
        <textarea
          className="w-full rounded-xl border bg-background/60 px-3 py-2 text-sm backdrop-blur"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isAuthenticated ? "Leave a comment…" : "로그인 후 댓글을 남겨 주세요"}
          aria-label="댓글"
          required
          disabled={!isAuthenticated}
          data-testid="comments-textarea"
        />
        {gateMsg ? (
          <p className="text-xs text-amber-300" role="status">
            {gateMsg}
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          disabled={!isAuthenticated}
          data-testid="comments-submit"
        >
          Post
        </button>
      </form>
      <ul className="mt-4 space-y-2">
        {comments.map((c) => {
          const liked = !isStub && isCommentLiked(c.id);
          const disliked = !isStub && isCommentDisliked(c.id);
          const own = !isStub && c.authorId === "self";
          return (
            <li key={c.id} className="rounded-lg border border-white/5 px-3 py-2 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-muted-foreground">{c.author}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(c.createdAt)}</p>
              </div>
              <p>{c.message}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
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
                    {own ? (
                      <button
                        type="button"
                        className="text-red-300"
                        data-testid="comments-delete-own"
                        onClick={() => {
                          deleteOwnComment(c.id, "self");
                          refresh();
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
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
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared" | "error">("idle");

  function buildInviteUrl(): string {
    const invite = resolveInviteRoomCode(gameSlug);
    return buildInvitePlayUrl(readInviteOrigin(), gameSlug, invite);
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

  async function handleCopyLink() {
    const url = buildInviteUrl();
    const ok = await copyText(url);
    setShareStatus(ok ? "copied" : "error");
    window.setTimeout(() => setShareStatus("idle"), 2200);
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
        if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "AbortError") {
          return;
        }
      }
    }

    await handleCopyLink();
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
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="game-detail-invite-copy"
          onClick={() => void handleCopyLink()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-card/50 py-3 text-sm font-medium backdrop-blur transition-colors hover:border-primary/30"
        >
          초대 링크 복사
        </button>
        <button
          type="button"
          data-testid="game-detail-share-btn"
          onClick={() => void handleShare("default")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-card/50 py-3 text-sm font-medium backdrop-blur transition-colors hover:border-primary/30"
        >
          <Share2 className="size-4" /> 공유하기
        </button>
      </div>
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
