"use client";

/**
 * Sprint 23 — Creator pipeline UI (extends SOON page; no real AI generator).
 */
import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";
import type { GameType } from "@game-platform/game-sdk/src/game-metadata";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  CREATOR_PIPELINE_STEPS,
  type CreatorGameRecord,
  type CreatorPipelineStatus,
  getClientCreatorGames,
  pipelineStepIndex,
  saveClientCreatorGames,
} from "@/lib/creator/creator-game-registry";

const STATUS_LABEL: Record<CreatorPipelineStatus, string> = {
  draft: "Draft",
  preview: "Preview",
  review: "Review",
  published: "Published",
};

async function syncRegistry(games: CreatorGameRecord[]): Promise<CreatorGameRecord[]> {
  saveClientCreatorGames(games);
  const res = await fetch("/api/creator/games", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ games }),
  });
  if (!res.ok) return games;
  const data = (await res.json()) as { games: CreatorGameRecord[] };
  saveClientCreatorGames(data.games);
  return data.games;
}

export function CreatorPipelinePanel() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [gameType, setGameType] = useState<GameType>("singleplayer");
  const [games, setGames] = useState<CreatorGameRecord[]>([]);
  const [active, setActive] = useState<CreatorGameRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/creator/games");
      if (res.ok) {
        const data = (await res.json()) as { games: CreatorGameRecord[] };
        saveClientCreatorGames(data.games);
        setGames(data.games);
        return;
      }
    } catch {
      /* local fallback */
    }
    setGames(getClientCreatorGames());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createDraft() {
    if (!title.trim()) {
      setError("게임 이름을 입력하세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/creator/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          thumbnailUrl: thumbnailUrl.trim() || null,
          gameType,
          creatorId: getDeviceId(),
          creatorName: getLastNickname() || "Creator",
        }),
      });
      if (!res.ok) throw new Error("create failed");
      const data = (await res.json()) as { game: CreatorGameRecord };
      const next = [data.game, ...games.filter((g) => g.id !== data.game.id)];
      await syncRegistry(next);
      setActive(data.game);
      setGames(next);
    } catch {
      setError("Draft 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(id: string, action: "preview" | "review") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/creator/games/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("transition failed");
      const data = (await res.json()) as { game: CreatorGameRecord };
      const next = games.map((g) => (g.id === id ? data.game : g));
      await syncRegistry(next);
      setGames(next);
      setActive(data.game);
    } catch {
      setError("상태 변경 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col py-10">
      <Container className="max-w-2xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
            AI Creator · SOON
          </p>
          <h1 className="mt-1 text-2xl font-bold">Creator Pipeline</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Draft → Preview → Review → Publish. Stub generate only — real AI engine deferred.
          </p>
        </div>

        <form
          className="space-y-3 rounded-2xl border border-white/10 bg-card/60 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void createDraft();
          }}
        >
          <label className="block text-sm">
            게임 이름
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Creator Game"
            />
          </label>
          <label className="block text-sm">
            설명
            <textarea
              className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="짧은 설명"
            />
          </label>
          <label className="block text-sm">
            썸네일 URL (optional)
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className="block text-sm">
            모드
            <select
              className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
              value={gameType}
              onChange={(e) => setGameType(e.target.value as GameType)}
            >
              <option value="singleplayer">Solo</option>
              <option value="multiplayer">Multiplayer</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Save Draft
          </button>
        </form>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        {active ? (
          <PipelineCard
            game={active}
            busy={busy}
            onPreview={() => void runAction(active.id, "preview")}
            onReview={() => void runAction(active.id, "review")}
          />
        ) : null}

        {games.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">My games</h2>
            {games.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActive(g)}
                className="block w-full rounded-xl border border-white/10 bg-card/40 px-4 py-3 text-left text-sm hover:border-primary/30"
              >
                <span className="font-medium">{g.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">{STATUS_LABEL[g.status]}</span>
                {g.contractCompliant ? (
                  <span className="ml-2 text-xs text-emerald-400">contract ✓</span>
                ) : null}
              </button>
            ))}
          </section>
        ) : null}

        <Link href="/" className="inline-block text-sm text-muted-foreground hover:text-foreground">
          ← 홈으로
        </Link>
      </Container>
    </main>
  );
}

function PipelineCard({
  game,
  busy,
  onPreview,
  onReview,
}: {
  game: CreatorGameRecord;
  busy: boolean;
  onPreview: () => void;
  onReview: () => void;
}) {
  const step = pipelineStepIndex(game.status);

  return (
    <div
      data-testid="creator-pipeline-card"
      className="rounded-2xl border border-white/10 bg-card/60 p-4 space-y-4"
    >
      <div className="flex flex-wrap gap-2">
        {CREATOR_PIPELINE_STEPS.map((s, i) => (
          <span
            key={s}
            className={`rounded-full px-2 py-0.5 text-xs ${
              i <= step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <p className="text-sm">
        <span className="font-semibold">{game.title}</span>
        <span className="ml-2 text-muted-foreground">{game.slug}</span>
      </p>
      <p className="text-xs text-muted-foreground">{game.description || "—"}</p>
      <p className="text-xs text-muted-foreground">
        {game.gameType === "multiplayer" ? "Multiplayer" : "Solo"} · template {game.templateSlug}
        {game.contractCompliant ? " · contract enforced" : ""}
      </p>

      <div className="flex flex-wrap gap-2">
        {game.status === "draft" ? (
          <button
            type="button"
            disabled={busy}
            onClick={onPreview}
            className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200"
          >
            Generate Preview (stub)
          </button>
        ) : null}
        {game.status === "preview" ? (
          <button
            type="button"
            disabled={busy}
            onClick={onReview}
            className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-200"
          >
            Submit for Review
          </button>
        ) : null}
        {(game.status === "preview" || game.status === "review" || game.status === "published") && (
          <>
            <Link
              href={`/games/${game.slug}`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold"
            >
              Detail
            </Link>
            <Link
              href={`/games/${game.slug}/play`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold"
            >
              Play Preview
            </Link>
          </>
        )}
      </div>

      {game.status === "review" ? (
        <p className="text-xs text-amber-300">Admin review pending — Publish via /admin/moderation</p>
      ) : null}
    </div>
  );
}
