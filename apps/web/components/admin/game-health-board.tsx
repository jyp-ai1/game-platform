"use client";

import type { GameHealthRow, GameHealthSnapshot } from "@/lib/game-health-data";

function VerdictBadge({ verdict }: { verdict: GameHealthRow["verdict"] }) {
  const styles = {
    PASS: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    FAIL: "bg-red-500/15 text-red-400 border-red-500/30",
    WARN: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    UNKNOWN: "bg-muted text-muted-foreground border-white/10",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[verdict]}`}>
      {verdict}
    </span>
  );
}

function formatMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

function GatePill({ status }: { status: "pass" | "fail" | "warn" | "skip" }) {
  const styles = {
    pass: "text-emerald-400",
    fail: "text-red-400",
    warn: "text-amber-400",
    skip: "text-muted-foreground",
  };
  const labels = { pass: "PASS", fail: "FAIL", warn: "WARN", skip: "SKIP" };
  return <span className={`text-[10px] font-semibold ${styles[status]}`}>{labels[status]}</span>;
}

function GameCard({ row }: { row: GameHealthRow }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.slug}</p>
        </div>
        <VerdictBadge verdict={row.verdict} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">최고 Stage</dt>
        <dd className="tabular-nums">{row.bestStage ?? "—"}</dd>
        <dt className="text-muted-foreground">평균 플레이</dt>
        <dd className="tabular-nums">{formatMs(row.avgPlayTimeMs)}</dd>
        <dt className="text-muted-foreground">Retry 비율</dt>
        <dd className="tabular-nums">{formatRate(row.retryRate)}</dd>
        <dt className="text-muted-foreground">평균 점수</dt>
        <dd className="tabular-nums">{row.avgScore ?? "—"}</dd>
        <dt className="text-muted-foreground">QA Score</dt>
        <dd className="tabular-nums">{row.score ?? "—"}</dd>
        {row.bestTile != null && row.bestTile > 0 ? (
          <>
            <dt className="text-muted-foreground">최고 타일</dt>
            <dd className="tabular-nums">{row.bestTile}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">최근 Crash</dt>
        <dd className={row.crashCount > 0 ? "truncate text-red-400" : "text-emerald-400"}>
          {row.recentCrash ? new Date(row.recentCrash).toLocaleDateString() : row.crashCount > 0 ? "YES" : "—"}
        </dd>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {row.releaseGate.map((check) => (
          <span
            key={check.id}
            className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px]"
            title={check.detail}
          >
            {check.label.replace(" PASS", "")} <GatePill status={check.status} />
          </span>
        ))}
      </div>

      {row.failureCause ? (
        <p className="mt-2 truncate text-xs text-amber-400" title={row.failureCause}>
          {row.failureStep}: {row.failureCause}
        </p>
      ) : null}
    </div>
  );
}

export function GameHealthBoard({ snapshot }: { snapshot: GameHealthSnapshot }) {
  const batch1 = snapshot.games.filter((g) => g.batch === 1);
  const batch2 = snapshot.games.filter((g) => g.batch === 2);
  const other = snapshot.games.filter((g) => g.batch == null);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs text-muted-foreground">PASS</p>
          <p className="text-2xl font-bold text-emerald-400">{snapshot.summary.pass}</p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs text-muted-foreground">FAIL</p>
          <p className="text-2xl font-bold text-red-400">{snapshot.summary.fail}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs text-muted-foreground">WARN</p>
          <p className="text-2xl font-bold text-amber-400">{snapshot.summary.warn}</p>
        </div>
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-xs text-muted-foreground">Batch 1 Ready</p>
          <p className={`text-2xl font-bold ${snapshot.batch1Ready ? "text-emerald-400" : "text-amber-400"}`}>
            {snapshot.batch1Ready ? "YES" : "NO"}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="text-xs text-muted-foreground">Release Gate</p>
          <p className={`text-2xl font-bold ${snapshot.releaseGateReady ? "text-emerald-400" : "text-red-400"}`}>
            {snapshot.releaseGateReady ? "GREEN" : "BLOCKED"}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Batch 1 — Bubble · 2048 · Memory · Color Match
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {batch1.map((row) => (
            <GameCard key={row.slug} row={row} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Batch 2 — Tetris · Air Hockey · Sudoku · Minesweeper
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {batch2.map((row) => (
            <GameCard key={row.slug} row={row} />
          ))}
        </div>
      </section>

      {other.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Multiplayer / Other
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {other.map((row) => (
              <GameCard key={row.slug} row={row} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
