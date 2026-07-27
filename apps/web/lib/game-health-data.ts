/**
 * Game Health Dashboard — reads latest full-loop QA report (server-side).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  BATCH_1_SLUGS,
  BATCH_2_SLUGS,
  GAME_STANDARD_REGISTRY,
} from "@game-platform/game-sdk";

export type GameHealthVerdict = "PASS" | "FAIL" | "WARN" | "UNKNOWN";

export type ReleaseGateCheckId =
  | "rule"
  | "stage"
  | "retry"
  | "save"
  | "score"
  | "qa";

export interface ReleaseGateCheck {
  id: ReleaseGateCheckId;
  label: string;
  status: "pass" | "fail" | "warn" | "skip";
  detail?: string;
}

export interface GameHealthRow {
  slug: string;
  title: string;
  batch: 1 | 2 | 3 | null;
  verdict: GameHealthVerdict;
  bestStage: number | null;
  avgPlayTimeMs: number | null;
  retryRate: number | null;
  avgScore: number | null;
  score: number | null;
  bestTile: number | null;
  crashCount: number;
  recentCrash: string | null;
  retryStep: string | null;
  saveStep: string | null;
  stageStep: string | null;
  qaSteps: Array<{ id: string; status: string; detail?: string }>;
  failureStep: string | null;
  failureCause: string | null;
  lastQaAt: string | null;
  releaseGate: ReleaseGateCheck[];
}

export interface GameHealthSnapshot {
  generatedAt: string;
  reportDate: string | null;
  summary: { pass: number; fail: number; warn: number; unknown: number };
  batch1Ready: boolean;
  releaseGateReady: boolean;
  games: GameHealthRow[];
}

type OperationalSnapshot = {
  bestStage?: number;
  bestScore?: number;
  bestTile?: number;
  retryCount?: number;
  playCount?: number;
  totalPlayTimeMs?: number;
  totalScoreSum?: number;
  sessionCount?: number;
  lastCrashAt?: string | null;
  avgPlayTimeMs?: number | null;
  avgScore?: number | null;
  retryRate?: number | null;
};

type FullLoopGame = {
  slug: string;
  verdict?: GameHealthVerdict;
  score?: number;
  failureStep?: string;
  failureCause?: string;
  thrownError?: string;
  operational?: OperationalSnapshot;
  steps?: Array<{ id: string; status: string; detail?: string }>;
};

type FullLoopReport = {
  date: string;
  generatedAt: string;
  summary: { pass: number; fail: number; warn: number };
  games: FullLoopGame[];
};

const BATCH_1_RULE_FILES = [
  "bubble-pop.md",
  "2048.md",
  "memory.md",
  "color-match.md",
];

function findLatestReportDir(): string | null {
  const base = path.join(process.cwd(), "docs/reports/full-loop");
  try {
    const dirs = readdirSync(base)
      .map((name) => path.join(base, name))
      .filter((p) => statSync(p).isDirectory())
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    return dirs[0] ?? null;
  } catch {
    return null;
  }
}

function loadLatestReport(): FullLoopReport | null {
  const dir = findLatestReportDir();
  if (!dir) return null;
  try {
    const raw = readFileSync(path.join(dir, "results.json"), "utf8");
    return JSON.parse(raw) as FullLoopReport;
  } catch {
    return null;
  }
}

function stepStatus(
  steps: FullLoopGame["steps"],
  id: string
): { status: string; detail?: string } | null {
  const found = steps?.find((s) => s.id === id);
  if (!found) return null;
  return { status: found.status, detail: found.detail };
}

function crashCount(game: FullLoopGame): number {
  if (game.thrownError || game.failureStep === "crash") return 1;
  return 0;
}

function buildReleaseGate(row: GameHealthRow, slug: string): ReleaseGateCheck[] {
  const rulePath = path.join(process.cwd(), "docs/game-rules", `${slug}.md`);
  const ruleExists = existsSync(rulePath);

  const stage = row.stageStep ?? "—";
  const retry = row.retryStep ?? "—";
  const save = row.saveStep ?? "—";
  const score = row.score != null && row.score > 0 ? "pass" : row.verdict === "PASS" ? "pass" : "warn";

  return [
    {
      id: "rule",
      label: "Rule PASS",
      status: ruleExists ? "pass" : "fail",
      detail: ruleExists ? "docs/game-rules" : "missing rule doc",
    },
    {
      id: "stage",
      label: "Stage PASS",
      status: stage === "pass" || stage === "skip" ? "pass" : stage === "—" ? "skip" : "fail",
      detail: row.stageStep ?? undefined,
    },
    {
      id: "retry",
      label: "Retry PASS",
      status: retry === "pass" ? "pass" : retry === "—" ? "skip" : "fail",
      detail: row.retryStep ?? undefined,
    },
    {
      id: "save",
      label: "Save PASS",
      status: save === "pass" ? "pass" : save === "warn" ? "warn" : "fail",
      detail: row.saveStep ?? undefined,
    },
    {
      id: "score",
      label: "Score PASS",
      status: score === "pass" ? "pass" : score === "warn" ? "warn" : "fail",
      detail: row.score != null ? `score=${row.score}` : "no score",
    },
    {
      id: "qa",
      label: "QA PASS",
      status: row.verdict === "PASS" ? "pass" : row.verdict === "WARN" ? "warn" : "fail",
      detail: row.verdict,
    },
  ];
}

function gateReady(checks: ReleaseGateCheck[]): boolean {
  return checks.every((c) => c.status === "pass" || c.status === "skip");
}

export function getGameHealthSnapshot(): GameHealthSnapshot {
  const report = loadLatestReport();
  const bySlug = new Map(report?.games.map((g) => [g.slug, g]) ?? []);

  const allSlugs = [...Object.keys(GAME_STANDARD_REGISTRY)];

  const games: GameHealthRow[] = allSlugs.map((slug) => {
    const def = GAME_STANDARD_REGISTRY[slug];
    const qa = bySlug.get(slug);
    const verdict: GameHealthVerdict = qa?.verdict ?? "UNKNOWN";
    const op = qa?.operational;
    const steps = qa?.steps ?? [];

    const stageClear = stepStatus(steps, "stageClear");
    const nextStage = stepStatus(steps, "nextStage");
    const retry = stepStatus(steps, "retry");
    const scoreSave = stepStatus(steps, "scoreSave");

    const row: GameHealthRow = {
      slug,
      title: def?.title ?? slug,
      batch: def?.batch ?? null,
      verdict,
      bestStage: op?.bestStage ?? null,
      avgPlayTimeMs: op?.avgPlayTimeMs ?? null,
      retryRate: op?.retryRate ?? null,
      avgScore: op?.avgScore ?? null,
      score: qa?.score ?? op?.bestScore ?? null,
      bestTile: op?.bestTile ?? null,
      crashCount: qa ? crashCount(qa) : 0,
      recentCrash: op?.lastCrashAt ?? (qa?.thrownError ? report?.generatedAt ?? null : null),
      retryStep: retry ? `${retry.status}${retry.detail ? ` (${retry.detail})` : ""}` : null,
      saveStep: scoreSave ? `${scoreSave.status}${scoreSave.detail ? ` (${scoreSave.detail})` : ""}` : null,
      stageStep:
        stageClear || nextStage
          ? [stageClear?.status, nextStage?.status].filter(Boolean).join("/")
          : null,
      qaSteps: steps,
      failureStep: qa?.failureStep ?? null,
      failureCause: qa?.failureCause ?? qa?.thrownError ?? null,
      lastQaAt: report?.generatedAt ?? null,
      releaseGate: [],
    };

    row.releaseGate = buildReleaseGate(row, slug);
    return row;
  });

  const batch1 = games.filter((g) => (BATCH_1_SLUGS as readonly string[]).includes(g.slug));
  const batch1Ready = batch1.length > 0 && batch1.every((g) => g.verdict === "PASS");
  const releaseGateReady =
    batch1Ready &&
    batch1.every((g) => gateReady(g.releaseGate)) &&
    BATCH_1_RULE_FILES.every((f) =>
      existsSync(path.join(process.cwd(), "docs/game-rules", f))
    );

  const pass = games.filter((g) => g.verdict === "PASS").length;
  const fail = games.filter((g) => g.verdict === "FAIL").length;
  const warn = games.filter((g) => g.verdict === "WARN").length;
  const unknown = games.filter((g) => g.verdict === "UNKNOWN").length;

  return {
    generatedAt: new Date().toISOString(),
    reportDate: report?.date ?? null,
    summary: { pass, fail, warn, unknown },
    batch1Ready,
    releaseGateReady,
    games,
  };
}

export function getBatchHealth(batch: 1 | 2): GameHealthRow[] {
  const slugs = batch === 1 ? BATCH_1_SLUGS : BATCH_2_SLUGS;
  return getGameHealthSnapshot().games.filter((g) =>
    (slugs as readonly string[]).includes(g.slug)
  );
}
