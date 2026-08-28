"use client";

/**
 * Sprint 24 — lightweight admin moderation (client reads local comments/reports).
 */
import type { Game } from "@game-platform/shared";
import { getGamePlayCounts } from "@game-platform/game-sdk";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { CreatorGameRecord } from "@/lib/creator/creator-game-registry";
import {
  listComments,
  listBugReports,
  type CommunityComment,
} from "@/lib/community-store";

type AdminUserRow = {
  device_id: string;
  nickname: string | null;
  status: string;
  last_seen: string | null;
};

export function ModerationDashboard({
  catalogGames,
  users,
}: {
  catalogGames: Game[];
  users: AdminUserRow[];
}) {
  const [creatorGames, setCreatorGames] = useState<CreatorGameRecord[]>([]);
  const [reviewQueue, setReviewQueue] = useState<CreatorGameRecord[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [reports, setReports] = useState<ReturnType<typeof listBugReports>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const playCounts = typeof window !== "undefined" ? getGamePlayCounts() : {};

  const refreshCreator = useCallback(async () => {
    const res = await fetch("/api/admin/moderation/creator-games");
    if (!res.ok) return;
    const data = (await res.json()) as {
      games: CreatorGameRecord[];
      reviewQueue: CreatorGameRecord[];
    };
    setCreatorGames(data.games);
    setReviewQueue(data.reviewQueue);
  }, []);

  useEffect(() => {
    void refreshCreator();
    setComments(listComments());
    setReports(listBugReports());
  }, [refreshCreator]);

  async function modAction(id: string, action: "publish" | "reject" | "unpublish") {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/moderation/creator-games", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) await refreshCreator();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8" data-testid="admin-moderation-dashboard">
      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Users</h2>
        <p className="text-xs text-muted-foreground">device_id · Supabase CRM stub</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-3">Device</th>
                <th className="py-2 pr-3">Nickname</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? (
                users.map((u) => (
                  <tr key={u.device_id} className="border-b border-border/40">
                    <td className="py-2 pr-3 font-mono text-xs">{u.device_id.slice(0, 12)}…</td>
                    <td className="py-2 pr-3">{u.nickname ?? "—"}</td>
                    <td className="py-2 pr-3">{u.status}</td>
                    <td className="py-2 text-xs text-muted-foreground">{u.last_seen ?? "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-muted-foreground">
                    No users (Supabase offline)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Games · status</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Slug</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 tabular-nums">Plays</th>
              </tr>
            </thead>
            <tbody>
              {catalogGames.slice(0, 20).map((g) => (
                <tr key={g.slug} className="border-b border-border/40">
                  <td className="py-2 pr-3">{g.title}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{g.slug}</td>
                  <td className="py-2 pr-3">{g.status}</td>
                  <td className="py-2 tabular-nums">
                    {Math.max(g.playCount ?? 0, playCounts[g.slug] ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Creator review queue</h2>
        {reviewQueue.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No games awaiting review</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {reviewQueue.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{g.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.slug} · {g.creatorName}
                    {g.contractCompliant ? " · contract ✓" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === g.id}
                    onClick={() => void modAction(g.id, "publish")}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Approve → Publish
                  </button>
                  <button
                    type="button"
                    disabled={busy === g.id}
                    onClick={() => void modAction(g.id, "reject")}
                    className="rounded-lg border px-3 py-1 text-xs"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Published creator games</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {creatorGames
            .filter((g) => g.status === "published")
            .map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/games/${g.slug}`} className="font-medium hover:underline">
                  {g.title}
                </Link>
                <button
                  type="button"
                  disabled={busy === g.id}
                  onClick={() => void modAction(g.id, "unpublish")}
                  className="rounded border px-2 py-0.5 text-xs"
                >
                  Unpublish
                </button>
              </li>
            ))}
        </ul>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Comments</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {comments.slice(0, 30).map((c) => (
              <li key={c.id} className="border-b border-border/40 pb-2">
                <span className="text-xs text-muted-foreground">{c.gameSlug}</span>
                <p>{c.message}</p>
                <p className="text-xs text-muted-foreground">
                  {c.author} · {c.createdAt.slice(0, 10)}
                </p>
              </li>
            ))}
            {!comments.length ? (
              <li className="text-muted-foreground">No local comments</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Reports (stub)</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {reports.slice(0, 20).map((r) => (
              <li key={r.id} className="border-b border-border/40 pb-2">
                <span className="text-xs text-muted-foreground">{r.gameSlug}</span>
                <p>{r.message}</p>
              </li>
            ))}
            {!reports.length ? (
              <li className="text-muted-foreground">No bug reports</li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Per-game play stats (honest local counts)</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {Object.entries(playCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([slug, count]) => (
              <li key={slug} className="flex justify-between rounded border border-border/40 px-2 py-1">
                <span>{slug}</span>
                <span className="tabular-nums">{count}</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
