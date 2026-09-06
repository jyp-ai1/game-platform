"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { StarRatingPanel } from "@/components/community-ratings-panel";
import type { GameComment } from "@/lib/supabase/game-comments";
import { MAX_COMMENT_LENGTH } from "@/lib/supabase/game-comments";
import {
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  type FeedbackType,
} from "@/lib/game-feedback-types";
import { getLastNickname } from "@game-platform/game-sdk";

export function GameDetailComments({ gameSlug }: { gameSlug: string }) {
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("opinion");
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [comments, setComments] = useState<GameComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(gameSlug)}/comments`);
      const data = (await res.json()) as { ok: boolean; comments?: GameComment[]; error?: string };
      if (!data.ok) {
        setLoadError(data.error ?? "댓글을 불러오지 못했습니다.");
        setComments([]);
        return;
      }
      setComments(data.comments ?? []);
    } catch {
      setLoadError("댓글을 불러오지 못했습니다.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [gameSlug]);

  useEffect(() => {
    setAuthor(getLastNickname() || "");
    void loadComments();
  }, [loadComments]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGateMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(gameSlug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: author || "Player", content: message, feedbackType }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        field?: "author" | "content";
        comment?: GameComment;
      };
      if (!data.ok) {
        setGateMsg(data.error ?? "댓글 등록 실패");
        return;
      }
      if (data.comment) {
        setComments((prev) => [data.comment!, ...prev]);
      } else {
        await loadComments();
      }
      setMessage("");
    } catch {
      setGateMsg("네트워크 오류 — 다시 시도하세요.");
    } finally {
      setSubmitting(false);
    }
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
      <p className="mt-1 text-xs text-muted-foreground">
        서버에 저장되는 피드백 · 기본 💬 의견 · 유형 선택 가능
      </p>
      <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
        <input
          className="w-full rounded-xl border bg-background/60 px-3 py-2 text-sm backdrop-blur"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="이름"
          aria-label="작성자"
          maxLength={32}
          data-testid="comments-author"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`feedback-type-${gameSlug}`} className="text-xs text-muted-foreground">
            유형
          </label>
          <select
            id={`feedback-type-${gameSlug}`}
            className="rounded-lg border bg-background/60 px-2 py-1 text-xs backdrop-blur"
            value={feedbackType}
            onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
            data-testid="comments-feedback-type"
          >
            {FEEDBACK_TYPES.map((type) => (
              <option key={type} value={type}>
                {FEEDBACK_TYPE_LABELS[type].emoji} {FEEDBACK_TYPE_LABELS[type].label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="w-full rounded-xl border bg-background/60 px-3 py-2 text-sm backdrop-blur"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave a comment…"
          aria-label="댓글"
          maxLength={MAX_COMMENT_LENGTH}
          data-testid="comments-textarea"
        />
        {gateMsg ? (
          <p className="text-xs text-amber-300" role="status" data-testid="comments-gate-msg">
            {gateMsg}
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          disabled={submitting}
          data-testid="comments-submit"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </form>
      {loadError ? (
        <p className="mt-3 text-xs text-amber-300" data-testid="comments-load-error">
          {loadError}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-4 text-xs text-muted-foreground">Loading comments…</p>
      ) : (
        <ul className="mt-4 space-y-2" data-testid="comments-list">
          {comments.length === 0 ? (
            <li className="text-xs text-muted-foreground">아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.</li>
          ) : null}
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-white/5 px-3 py-2 text-sm" data-testid="comment-item">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {c.author}
                  <span className="ml-2" data-testid="comment-feedback-type">
                    {FEEDBACK_TYPE_LABELS[c.feedbackType]?.emoji ?? "💬"}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground">{formatDate(c.createdAt)}</p>
              </div>
              <p data-testid="comment-content">{c.content}</p>
            </li>
          ))}
        </ul>
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
