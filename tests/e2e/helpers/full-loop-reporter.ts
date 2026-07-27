import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FullLoopCheckId, FullLoopStepResult, GameFullLoopResult } from "./runGameFullLoop";

export type FullLoopVerdict = "PASS" | "FAIL" | "WARN";
export type FullLoopPriority = "P0" | "P1" | "P2";

export type FullLoopGameRecord = GameFullLoopResult & {
  displayName: string;
  verdict: FullLoopVerdict;
  priority: FullLoopPriority | null;
  failureStep?: string;
  failureCause?: string;
  thrownError?: string;
  screenshotPath?: string;
  logPath?: string;
  consoleLogs?: string[];
};

export type FullLoopReportBundle = {
  date: string;
  generatedAt: string;
  summary: { pass: number; fail: number; warn: number };
  backlog: Record<FullLoopPriority, Array<{ slug: string; step: string; cause: string }>>;
  games: FullLoopGameRecord[];
  markdownPath: string;
  jsonPath: string;
};

const GAME_NAMES: Record<string, string> = {
  "bubble-pop": "Bubble Pop",
  "2048": "2048",
  memory: "Memory",
  tetris: "Tetris",
  "air-hockey": "Air Hockey",
  "color-match": "Color Match",
  snake: "Snake",
};

const P0_STEPS = new Set<FullLoopCheckId>(["start", "tutorial", "gameOver", "retry", "stageClear", "nextStage"]);
const P1_STEPS = new Set<FullLoopCheckId>(["scoreSave", "xp", "coin", "dailyMission", "journey", "replay"]);

const STEP_LABELS: Partial<Record<FullLoopCheckId, string>> = {
  start: "게임 진입",
  tutorial: "튜토리얼",
  stageClear: "Stage Clear",
  nextStage: "Next Stage",
  gameOver: "Game Over",
  retry: "Retry",
  result: "Result",
  scoreSave: "Score 저장",
  xp: "XP 지급",
  coin: "Coin 지급",
  dailyMission: "Daily Mission",
  journey: "Journey",
  replay: "Replay 저장",
  leaderboard: "Leaderboard",
};

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function displayName(slug: string): string {
  return GAME_NAMES[slug] ?? slug;
}

function stepLabel(id: FullLoopCheckId): string {
  return STEP_LABELS[id] ?? id;
}

function primaryFailure(steps: FullLoopStepResult[]): FullLoopStepResult | undefined {
  return steps.find((s) => s.status === "fail");
}

export function classifyVerdict(record: {
  steps: FullLoopStepResult[];
  consoleErrors: number;
  thrownError?: string;
}): FullLoopVerdict {
  if (record.thrownError || record.consoleErrors > 0 || record.steps.some((s) => s.status === "fail")) {
    return "FAIL";
  }
  if (record.steps.some((s) => s.status === "warn")) {
    return "WARN";
  }
  return "PASS";
}

export function classifyPriority(record: {
  steps: FullLoopStepResult[];
  consoleErrors: number;
  thrownError?: string;
}): FullLoopPriority | null {
  if (record.thrownError || record.consoleErrors > 0) {
    return "P0";
  }

  const fails = record.steps.filter((s) => s.status === "fail");
  if (fails.some((s) => P0_STEPS.has(s.id))) return "P0";
  if (fails.some((s) => P1_STEPS.has(s.id))) return "P1";

  const warns = record.steps.filter((s) => s.status === "warn");
  if (fails.length > 0) return "P1";
  if (warns.length > 0) return "P2";
  return null;
}

export function buildGameRecord(
  result: GameFullLoopResult,
  extras: {
    thrownError?: string;
    screenshotPath?: string;
    logPath?: string;
    consoleLogs?: string[];
  } = {}
): FullLoopGameRecord {
  const base = {
    ...result,
    consoleLogs: extras.consoleLogs ?? [],
    thrownError: extras.thrownError,
    screenshotPath: extras.screenshotPath,
    logPath: extras.logPath,
  };
  const verdict = classifyVerdict(base);
  const priority = classifyPriority(base);
  const fail = primaryFailure(result.steps);

  let failureStep: string | undefined;
  let failureCause: string | undefined;

  if (extras.thrownError) {
    failureStep = "crash";
    failureCause = stripAnsi(extras.thrownError);
  } else if (result.consoleErrors > 0) {
    failureStep = "crash";
    failureCause = stripAnsi(extras.consoleLogs?.[0] ?? "console error");
  } else if (fail) {
    failureStep = stepLabel(fail.id);
    failureCause = stripAnsi(fail.detail ?? fail.id);
  } else {
    const warn = result.steps.find((s) => s.status === "warn");
    if (warn && verdict === "WARN") {
      failureStep = stepLabel(warn.id);
      failureCause = warn.detail ?? warn.id;
    }
  }

  return {
    ...result,
    displayName: displayName(result.slug),
    verdict,
    priority,
    failureStep,
    failureCause,
    thrownError: extras.thrownError,
    screenshotPath: extras.screenshotPath,
    logPath: extras.logPath,
    consoleLogs: extras.consoleLogs ?? [],
  };
}

function buildBacklog(games: FullLoopGameRecord[]): FullLoopReportBundle["backlog"] {
  const backlog: FullLoopReportBundle["backlog"] = { P0: [], P1: [], P2: [] };

  for (const game of games) {
    if (game.verdict === "PASS") continue;

    const priority = game.priority ?? (game.verdict === "WARN" ? "P2" : "P1");
    backlog[priority].push({
      slug: game.slug,
      step: game.failureStep ?? "unknown",
      cause: game.failureCause ?? game.thrownError ?? "see steps",
    });
  }

  return backlog;
}

function gameSection(game: FullLoopGameRecord, artifactRoot: string): string {
  const lines: string[] = [];
  lines.push(`### ${game.displayName} — ${game.verdict}${game.priority ? ` (${game.priority})` : ""}`);
  lines.push("");

  if (game.verdict === "PASS") {
    lines.push(`score: ${game.score ?? "—"} · ${game.durationMs}ms`);
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`**단계:** ${game.failureStep ?? "—"}`);
  lines.push(`**원인:** ${game.failureCause ?? "—"}`);

  if (game.thrownError) {
    lines.push("");
    lines.push("```");
    lines.push(stripAnsi(game.thrownError));
    lines.push("```");
  }

  const fails = game.steps.filter((s) => s.status === "fail");
  const warns = game.steps.filter((s) => s.status === "warn");
  if (fails.length > 0 || warns.length > 0) {
    lines.push("");
    lines.push("**체크리스트:**");
    for (const s of [...fails, ...warns]) {
      lines.push(`- ${stepLabel(s.id)}: ${s.status}${s.detail ? ` — ${stripAnsi(s.detail)}` : ""}`);
    }
  }

  if (game.screenshotPath) {
    lines.push("");
    lines.push(`**스크린샷:** \`${path.relative(artifactRoot, game.screenshotPath).replace(/\\/g, "/")}\``);
  }
  if (game.logPath) {
    lines.push(`**로그:** \`${path.relative(artifactRoot, game.logPath).replace(/\\/g, "/")}\``);
  }
  if (game.consoleLogs && game.consoleLogs.length > 0) {
    lines.push("");
    lines.push("**Console:**");
    lines.push("```");
    lines.push(game.consoleLogs.slice(0, 8).map(stripAnsi).join("\n"));
    lines.push("```");
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

export function renderFullLoopMarkdown(bundle: FullLoopReportBundle, repoRoot: string): string {
  const { summary, games, backlog, date } = bundle;
  const lines: string[] = [];

  lines.push(`# Sprint 13 Full Loop QA — ${date}`);
  lines.push("");
  lines.push("> FAIL-first 수집 · 수정 없음 · Tier B single-player");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| PASS | FAIL | WARN |");
  lines.push("| ---: | ---: | ---: |");
  lines.push(`| ${summary.pass} | ${summary.fail} | ${summary.warn} |`);
  lines.push("");

  lines.push("## Results");
  lines.push("");
  for (const game of games) {
    lines.push(gameSection(game, repoRoot));
  }

  lines.push("## Backlog (auto-priority)");
  lines.push("");
  lines.push("### P0 — 게임 진입 불가 · Retry · 멈춤 · Crash");
  lines.push("");
  if (backlog.P0.length === 0) lines.push("_none_");
  for (const item of backlog.P0) {
    lines.push(`- **${displayName(item.slug)}** · ${item.step} — ${item.cause}`);
  }
  lines.push("");
  lines.push("### P1 — Score · Journey · Mission");
  lines.push("");
  if (backlog.P1.length === 0) lines.push("_none_");
  for (const item of backlog.P1) {
    lines.push(`- **${displayName(item.slug)}** · ${item.step} — ${item.cause}`);
  }
  lines.push("");
  lines.push("### P2 — UI · Animation · Warning");
  lines.push("");
  if (backlog.P2.length === 0) lines.push("_none_");
  for (const item of backlog.P2) {
    lines.push(`- **${displayName(item.slug)}** · ${item.step} — ${item.cause}`);
  }
  lines.push("");

  return lines.join("\n");
}

export async function writeFullLoopReport(
  games: FullLoopGameRecord[],
  repoRoot: string,
  date = new Date().toISOString().slice(0, 10)
): Promise<FullLoopReportBundle> {
  const reportDir = path.join(repoRoot, "docs/reports/full-loop", date);
  const artifactDir = path.join(reportDir, "artifacts");
  await mkdir(artifactDir, { recursive: true });

  const summary = {
    pass: games.filter((g) => g.verdict === "PASS").length,
    fail: games.filter((g) => g.verdict === "FAIL").length,
    warn: games.filter((g) => g.verdict === "WARN").length,
  };

  const bundle: FullLoopReportBundle = {
    date,
    generatedAt: new Date().toISOString(),
    summary,
    backlog: buildBacklog(games),
    games,
    markdownPath: path.join(reportDir, `${date}.md`),
    jsonPath: path.join(reportDir, "results.json"),
  };

  const markdown = renderFullLoopMarkdown(bundle, repoRoot);
  await writeFile(bundle.markdownPath, markdown, "utf8");
  await writeFile(bundle.jsonPath, JSON.stringify(bundle, null, 2), "utf8");

  return bundle;
}

export function formatSummaryLine(bundle: FullLoopReportBundle): string {
  return `PASS ${bundle.summary.pass} · FAIL ${bundle.summary.fail} · WARN ${bundle.summary.warn}`;
}
