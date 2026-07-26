/** Playtest Report — auto summary when sheets accumulate */
import { loadPlaytestLogs } from "./snake-playtest-log";
import {
  FUN_BREAK_AT_LABEL,
  FUN_BREAK_WHY_LABEL,
  loadBlindTests,
  loadObservationSheets,
  loadStrangerTests,
  type FunBreakAt,
  type FunBreakWhy,
} from "./snake-playtest-observation";
import { getPostDeathActionSummary } from "./snake-telemetry";

export interface PlaytestReportData {
  generatedAt: string;
  observationCount: number;
  playtestLogCount: number;
  /** 😊 웃음 (첫 사망 시) */
  laughedRate: number;
  /** 😡 바로 종료 */
  quitImmediatelyRate: number;
  /** 🔥 한 판 더 (스스로) */
  oneMoreRate: number;
  /** 👥 친구 초대 (죽은 후 3초 + 관찰) */
  inviteRate: number;
  /** 🤖 BOT → 사람 판정 */
  botHumanRate: number;
  /** 재밌었다 */
  saidFunRate: number;
  /** 재미 꺾임 시점 분포 */
  funBreakAt: Partial<Record<FunBreakAt, number>>;
  /** 재미 꺾임 이유 TOP */
  funBreakWhy: Partial<Record<FunBreakWhy, number>>;
  postDeathKpi: ReturnType<typeof getPostDeathActionSummary>;
  blindReplayRate: number;
  formatted: string;
}

function pct(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

function topWhy(why: Partial<Record<FunBreakWhy, number>>): string {
  const entries = Object.entries(why) as [FunBreakWhy, number][];
  if (entries.length === 0) return "—";
  entries.sort((a, b) => b[1] - a[1]);
  const [k, v] = entries[0]!;
  return `${FUN_BREAK_WHY_LABEL[k]} (${v}회)`;
}

/** Replay Playtest Report — 10개 쌓이면 자동 생성 */
export function generatePlaytestReport(): PlaytestReportData {
  const sheets = loadObservationSheets();
  const logs = loadPlaytestLogs();
  const strangers = loadStrangerTests();
  const blind = loadBlindTests();
  const postDeathKpi = getPostDeathActionSummary();
  const n = sheets.length;

  const laughed = sheets.filter((s) => s.firstDeath.laughed).length;
  const quit = sheets.filter((s) => s.firstDeath.quitImmediately).length;
  const oneMore = sheets.filter((s) => s.pressedOneMoreSelf).length;
  const saidFun = sheets.filter((s) => s.saidFun).length;
  const observedInvite = sheets.filter((s) => s.invitedFriendWithin3s).length;

  const turingLogs = logs.filter((l) => l.turing);
  const turingHuman = turingLogs.filter((l) => l.turing!.thoughtHuman).length;
  const strangerHuman = strangers.filter((s) => s.thoughtHuman).length;
  const botSamples = turingLogs.length + strangers.length;
  const botHuman = turingHuman + strangerHuman;

  const inviteTelemetry = postDeathKpi.sampleSize > 0 ? postDeathKpi.invite : 0;
  const inviteRate = n > 0
    ? Math.max(pct(observedInvite, n), inviteTelemetry)
    : inviteTelemetry;

  const funBreakAt: Partial<Record<FunBreakAt, number>> = {};
  const funBreakWhy: Partial<Record<FunBreakWhy, number>> = {};
  for (const s of sheets) {
    if (s.funBreak) {
      funBreakAt[s.funBreak.at] = (funBreakAt[s.funBreak.at] ?? 0) + 1;
      funBreakWhy[s.funBreak.why] = (funBreakWhy[s.funBreak.why] ?? 0) + 1;
    }
  }

  const laughedRate = pct(laughed, n);
  const quitImmediatelyRate = pct(quit, n);
  const oneMoreRate = pct(oneMore, n);
  const saidFunRate = pct(saidFun, n);
  const botHumanRate = pct(botHuman, botSamples);
  const blindReplayRate = blind.length ? blind.filter((b) => b.chose === "replay").length / blind.length : 0;

  const formatted = [
    "Replay Playtest Report",
    "",
    `생성: ${new Date().toLocaleString("ko-KR")}`,
    `Observation ${n} · Playtest Log ${logs.length} · Stranger ${strangers.length}`,
    "",
    `😊 웃음          ${(laughedRate * 100).toFixed(0)}%`,
    `😡 바로 종료      ${(quitImmediatelyRate * 100).toFixed(0)}%`,
    `🔥 한 판 더       ${(oneMoreRate * 100).toFixed(0)}%`,
    `👥 친구 초대      ${(inviteRate * 100).toFixed(0)}%`,
    `🤖 BOT 사람 판정  ${botSamples ? (botHumanRate * 100).toFixed(0) : "—"}%`,
    `😄 재밌었다       ${(saidFunRate * 100).toFixed(0)}%`,
    "",
    "재미 꺾임 시점",
    ...Object.entries(funBreakAt).map(([k, v]) => `  ${FUN_BREAK_AT_LABEL[k as FunBreakAt]}: ${v}회`),
    "",
    `재미 꺾임 #1 이유: ${topWhy(funBreakWhy)}`,
    "",
    "죽은 후 3초 행동",
    postDeathKpi.formatted,
    "",
    blind.length ? `Blind Test Replay ${(blindReplayRate * 100).toFixed(0)}% (n=${blind.length})` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    generatedAt: new Date().toISOString(),
    observationCount: n,
    playtestLogCount: logs.length,
    laughedRate,
    quitImmediatelyRate,
    oneMoreRate,
    inviteRate,
    botHumanRate,
    saidFunRate,
    funBreakAt,
    funBreakWhy,
    postDeathKpi,
    blindReplayRate,
    formatted,
  };
}

export const PlaytestReport = {
  generate: generatePlaytestReport,
};
