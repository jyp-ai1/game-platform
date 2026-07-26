/** Playtest log — player validation records (not dev logs) */
import { PLAYTEST_MERGE_GATES } from "./snake-playtest-tuning";
import { detectEnvironment, getGlobalWorldTelemetrySummary, getSnakeTelemetryHistory } from "./snake-telemetry";
import { evaluateObservationGates } from "./snake-playtest-observation";

export interface PlaytestChecklist {
  funIn5s?: boolean;
  feltCrowded?: boolean;
  aiHardToTell?: boolean;
  eventsNatural?: boolean;
  stayedAfterDeath?: boolean;
  rematched?: boolean;
  wantedAnother?: boolean;
}

export interface PlaytestLogEntry {
  id: number;
  at: string;
  environment: string;
  playMin: number;
  good: string[];
  bad: string[];
  fixes: string[];
  checklist?: PlaytestChecklist;
  turing?: { botName: string; thoughtHuman: boolean };
}

const LOG_KEY = "play29:snake-playtest-log";

export function loadPlaytestLogs(): PlaytestLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as PlaytestLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendPlaytestLog(entry: Omit<PlaytestLogEntry, "id" | "at"> & { at?: string }): PlaytestLogEntry {
  const logs = loadPlaytestLogs();
  const item: PlaytestLogEntry = {
    id: (logs[0]?.id ?? 0) + 1,
    at: entry.at ?? new Date().toISOString(),
    environment: entry.environment || detectEnvironment(),
    playMin: entry.playMin,
    good: entry.good,
    bad: entry.bad,
    fixes: entry.fixes,
    checklist: entry.checklist,
    turing: entry.turing,
  };
  logs.unshift(item);
  if (typeof window !== "undefined") {
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 50)));
  }
  return item;
}

/** Format like PM example — copy from console after session */
export function formatPlaytestLog(entry: PlaytestLogEntry): string {
  const lines = [
    `Playtest #${entry.id}`,
    "",
    "환경",
    entry.environment,
    "",
    "플레이",
    `${entry.playMin}분`,
    "",
    "좋았던 점",
    ...entry.good.map((g) => `- ${g}`),
    "",
    "별로였던 점",
    ...entry.bad.map((b) => `- ${b}`),
    "",
    "수정",
    ...entry.fixes.map((f) => `- ${f}`),
  ];
  if (entry.turing) {
    lines.push("", "Turing Test", `${entry.turing.botName} → ${entry.turing.thoughtHuman ? "사람 같음" : "BOT 티남"}`);
  }
  if (entry.checklist) {
    lines.push("", "Checklist", JSON.stringify(entry.checklist, null, 2));
  }
  return lines.join("\n");
}

export function exportPlaytestLogsText(): string {
  return loadPlaytestLogs().map(formatPlaytestLog).join("\n\n---\n\n");
}

export interface MergeGateStatus {
  pass: boolean;
  avgPlayMin: number;
  rematchRate: number;
  spectatorRejoinRate: number;
  aiHumanRate: number;
  playtestCount: number;
  observation: ReturnType<typeof evaluateObservationGates>;
  blockers: string[];
}

export function evaluateMergeGates(): MergeGateStatus {
  const telem = getGlobalWorldTelemetrySummary();
  const logs = loadPlaytestLogs();
  const observation = evaluateObservationGates();
  const turing = logs.filter((l) => l.turing);
  const aiHumanRate = turing.length
    ? turing.filter((l) => l.turing!.thoughtHuman).length / turing.length
    : 0;

  const blockers: string[] = [];
  if (telem.avgPlayMin < PLAYTEST_MERGE_GATES.avgPlayMin) {
    blockers.push(`평균 플레이 ${telem.avgPlayMin.toFixed(1)}분 < ${PLAYTEST_MERGE_GATES.avgPlayMin}분`);
  }
  if (telem.rematchRate < PLAYTEST_MERGE_GATES.rematchRate) {
    blockers.push(`리매치 ${(telem.rematchRate * 100).toFixed(0)}% < 60%`);
  }
  if (telem.spectatorRejoinRate < PLAYTEST_MERGE_GATES.spectatorRejoinRate) {
    blockers.push(`관전 재입장 ${(telem.spectatorRejoinRate * 100).toFixed(0)}% < 40%`);
  }
  if (turing.length >= 5 && aiHumanRate < PLAYTEST_MERGE_GATES.aiHumanRate) {
    blockers.push(`AI Turing ${(aiHumanRate * 100).toFixed(0)}% < 50%`);
  }
  if (logs.filter((l) => l.checklist?.wantedAnother).length < 3) {
    blockers.push('"또 한다" YES 로그 3개 미만');
  }
  blockers.push(...observation.blockers);

  return {
    pass: blockers.length === 0 && logs.length >= 3,
    avgPlayMin: telem.avgPlayMin,
    rematchRate: telem.rematchRate,
    spectatorRejoinRate: telem.spectatorRejoinRate,
    aiHumanRate,
    playtestCount: logs.length,
    observation,
    blockers,
  };
}

/** Auto-draft from last telemetry session — complete in console via appendPlaytestLog */
export function draftPlaytestFromSession(sessionIndex = 0): string {
  const s = getSnakeTelemetryHistory()[sessionIndex];
  if (!s) return "No telemetry session";
  const draft = appendPlaytestLog({
    environment: s.environment ?? detectEnvironment(),
    playMin: Math.round((s.survivalMs / 60_000) * 10) / 10,
    good: s.firstFunMs && s.firstFunMs <= 5000 ? ["5초 안에 재미 신호"] : [],
    bad: [],
    fixes: [],
    checklist: {
      funIn5s: s.firstFunMs != null && s.firstFunMs <= 5000,
      rematched: s.rematch,
      stayedAfterDeath: s.spectatorRejoin || s.exitPoint === "spectator",
    },
    turing: s.turingPromptBot
      ? { botName: s.turingPromptBot, thoughtHuman: false }
      : undefined,
  });
  return formatPlaytestLog(draft);
}

export const PlaytestLog = {
  append: appendPlaytestLog,
  load: loadPlaytestLogs,
  format: formatPlaytestLog,
  export: exportPlaytestLogsText,
  gates: evaluateMergeGates,
  draft: draftPlaytestFromSession,
  env: detectEnvironment,
};
