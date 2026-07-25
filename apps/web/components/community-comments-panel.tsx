"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Flag, Heart, MessageCircle, Share2, ThumbsDown } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import {
  isCommentLiked,
  isCommentDisliked,
  listComments,
  listReplies,
  postComment,
  reportComment,
  toggleCommentLike,
  toggleCommentDislike,
  type CommentSort,
  type CommunityComment,
} from "@/lib/community-store";
import { ensureCommunityMockData } from "@/lib/community-mock";

export function CommunityCommentsPanel({ games }: { games: Game[] }) {
  const [gameSlug, setGameSlug] = useState(games[0]?.slug ?? "");
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sort, setSort] = useState<CommentSort>("recent");
  const [items, setItems] = useState<CommunityComment[]>([]);
  const [, tick] = useState(0);

  useEffect(() => {
    ensureCommunityMockData();
    refresh();
  }, [sort]);

  function refresh() {
    setItems(listComments(sort).filter((c) => !c.parentId));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    postComment(gameSlug, message, { parentId: replyTo ?? undefined });
    setMessage("");
    setReplyTo(null);
    refresh();
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card/50 p-6 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comments</h2>
        <div className="flex gap-1 text-xs">
          {(["recent", "popular"] as CommentSort[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`rounded-lg px-2 py-1 ${sort === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {s === "recent" ? "Recent" : "Popular"}
            </button>
          ))}
        </div>
      </div>

      <form className="mt-4 space-y-2" onSubmit={handleSubmit}>
        {replyTo ? (
          <p className="text-xs text-primary">
            Replying…{" "}
            <button type="button" className="underline" onClick={() => setReplyTo(null)}>
              cancel
            </button>
          </p>
        ) : null}
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
        <ul className="mt-4 space-y-3">
          {items.slice(0, 8).map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              onReply={() => setReplyTo(c.id)}
              onChange={() => {
                refresh();
                tick((n) => n + 1);
              }}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function CommentRow({
  comment,
  onReply,
  onChange,
}: {
  comment: CommunityComment;
  onReply: () => void;
  onChange: () => void;
}) {
  const replies = listReplies(comment.id);
  const liked = isCommentLiked(comment.id);
  const disliked = isCommentDisliked(comment.id);

  return (
    <li className="rounded-xl border border-white/5 bg-background/40 px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-primary">{comment.gameSlug}</span>
          <span className="ml-2 text-xs text-muted-foreground">{comment.author}</span>
          <p className="mt-0.5">{comment.message}</p>
        </div>
      </div>
      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          className={`flex items-center gap-1 ${liked ? "text-red-400" : ""}`}
          onClick={() => {
            toggleCommentLike(comment.id);
            onChange();
          }}
        >
          <Heart className="size-3" fill={liked ? "currentColor" : "none"} />
          {comment.likes}
        </button>
        <button
          type="button"
          className={`flex items-center gap-1 ${disliked ? "text-amber-400" : ""}`}
          onClick={() => {
            toggleCommentDislike(comment.id);
            onChange();
          }}
        >
          <ThumbsDown className="size-3" fill={disliked ? "currentColor" : "none"} />
        </button>
        <button type="button" className="flex items-center gap-1" onClick={onReply}>
          <MessageCircle className="size-3" /> Reply
        </button>
        <button
          type="button"
          className="flex items-center gap-1"
          onClick={() => reportComment(comment.id)}
        >
          <Flag className="size-3" /> Report
        </button>
      </div>
      {replies.length > 0 ? (
        <ul className="mt-2 space-y-1 border-l-2 border-primary/20 pl-3">
          {replies.map((r) => (
            <li key={r.id} className="text-xs text-muted-foreground">
              <span className="text-primary">{r.author}</span>: {r.message}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CommunityAiSummary() {
  const [lines, setLines] = useState<{ gameSlug: string; count: number; theme: string }[]>([]);

  useEffect(() => {
    import("@/lib/community-store").then((m) => setLines(m.getCommunityAiSummary()));
  }, []);

  if (lines.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-card/40 p-4 text-sm text-muted-foreground">
        AI Summary — no issues detected today.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <h3 className="font-semibold">AI Summary</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {lines.map((l) => (
          <li key={l.gameSlug}>
            {l.gameSlug} — {l.count}건 ({l.theme})
          </li>
        ))}
      </ul>
    </section>
  );
}
