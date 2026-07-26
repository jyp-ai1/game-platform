/** Observation QA — human observer records (not dev telemetry) */
import { PLAYTEST_MERGE_GATES } from "./snake-playtest-tuning";
import { getPostDeathActionSummary } from "./snake-telemetry";

export type PlayerSegment = "self" | "dev" | "non_gamer" | "middle_school" | "elementary";

export type FunBreakAt = "10s" | "30s" | "1min" | "3min" | "never";

export type FunBreakWhy =
  | "no_food"
  | "empty"
  | "too_easy"
  | "too_hard"
  | "death_boring"
  | "no_goal"
  | "other";

export const FUN_BREAK_AT_LABEL: Record<FunBreakAt, string> = {
  "10s": "10초",
  "30s": "30초",
  "1min": "1분",
  "3min": "3분",
  never: "끝까지 안깨짐",
};

export const FUN_BREAK_WHY_LABEL: Record<FunBreakWhy, string> = {
  no_food: "먹이가 없음",
  empty: "사람이 없는 느낌",
  too_easy: "너무 쉬움",
  too_hard: "너무 어려움",
  death_boring: "죽고 재미없음",
  no_goal: "목표가 없음",
  other: "기타",
};

export interface FirstDeathObservation {
  swore?: boolean;
  laughed?: boolean;
  quitImmediately?: boolean;
  spectated?: boolean;
}

export interface FunBreakObservation {
  at: FunBreakAt;
  why: FunBreakWhy;
}

export interface ObservationSheet {
  id: number;
  at: string;
  playerLabel: string;
  segment: PlayerSegment;
  observer: string;
  playMin: number;
  /** 0~5초: 시작하자마자 움직였는가 */
  movedImmediately: boolean;
  /** 30초: 먹이 집중 vs 멍함 */
  focusAt30s: "food" | "idle" | "exploring" | "unknown";
  /** 재미가 꺾인 순간 — 언제? 왜? */
  funBreak?: FunBreakObservation;
  firstDeath: FirstDeathObservation;
  /** 스스로 한 판 더 눌렀는가 */
  pressedOneMoreSelf: boolean;
  /** 죽은 후 3초 안 친구 초대 시도 (관찰) */
  invitedFriendWithin3s?: boolean;
  /** 종료 시 "재밌었다"고 말했는가 — Merge Gate */
  saidFun: boolean;
  notes?: string;
}

export interface BlindTestEntry {
  id: number;
  at: string;
  playerLabel: string;
  chose: "slither" | "replay";
}

/** Stranger Test — 모르는 사람 2명, 같은 WORLD, 10분, 말 안 시킴 */
export interface StrangerTestEntry {
  id: number;
  at: string;
  observer: string;
  /** 관찰 대상 (다른 플레이어) */
  targetLabel: string;
  /** 사람 같았는가 */
  thoughtHuman: boolean;
  notes?: string;
}

const SHEET_KEY = "play29:snake-observation";
const BLIND_KEY = "play29:snake-blind-test";
const STRANGER_KEY = "play29:snake-stranger-test";

const SEGMENT_LABEL: Record<PlayerSegment, string> = {
  self: "본인",
  dev: "개발자",
  non_gamer: "게임 안 하는 친구",
  middle_school: "중학생",
  elementary: "초등학생",
};

export function loadObservationSheets(): ObservationSheet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHEET_KEY);
    return raw ? (JSON.parse(raw) as ObservationSheet[]) : [];
  } catch {
    return [];
  }
}

export function appendObservationSheet(
  entry: Omit<ObservationSheet, "id" | "at"> & { at?: string }
): ObservationSheet {
  const sheets = loadObservationSheets();
  const item: ObservationSheet = {
    id: (sheets[0]?.id ?? 0) + 1,
    at: entry.at ?? new Date().toISOString(),
    playerLabel: entry.playerLabel,
    segment: entry.segment,
    observer: entry.observer,
    playMin: entry.playMin,
    movedImmediately: entry.movedImmediately,
    focusAt30s: entry.focusAt30s,
    funBreak: entry.funBreak,
    firstDeath: entry.firstDeath,
    pressedOneMoreSelf: entry.pressedOneMoreSelf,
    invitedFriendWithin3s: entry.invitedFriendWithin3s,
    saidFun: entry.saidFun,
    notes: entry.notes,
  };
  sheets.unshift(item);
  if (typeof window !== "undefined") {
    localStorage.setItem(SHEET_KEY, JSON.stringify(sheets.slice(0, 100)));
  }
  return item;
}

export function formatObservationSheet(sheet: ObservationSheet): string {
  const fd = sheet.firstDeath;
  const deathLines = [
    fd.swore ? "욕함" : null,
    fd.laughed ? "웃음" : null,
    fd.quitImmediately ? "바로 종료" : null,
    fd.spectated ? "관전" : null,
  ].filter(Boolean);

  const lines = [
    `Observation #${sheet.id}`,
    "",
    "플레이어",
    `${sheet.playerLabel} (${SEGMENT_LABEL[sheet.segment]})`,
    "",
    "관찰자",
    sheet.observer,
    "",
    "플레이",
    `${sheet.playMin}분`,
    "",
    "0~5초 — 움직였는가?",
    sheet.movedImmediately ? "YES" : "NO",
    "",
    "30초 — 집중?",
    sheet.focusAt30s === "food"
      ? "먹이에 집중"
      : sheet.focusAt30s === "idle"
        ? "멍하니 있음"
        : sheet.focusAt30s === "exploring"
          ? "탐험/이동"
          : "불명",
  ];

  if (sheet.funBreak) {
    lines.push(
      "",
      "재미 꺾임",
      `언제: ${FUN_BREAK_AT_LABEL[sheet.funBreak.at]}`,
      `왜: ${FUN_BREAK_WHY_LABEL[sheet.funBreak.why]}`
    );
  }

  lines.push(
    "",
    "첫 사망",
    deathLines.length ? deathLines.map((l) => `- ${l}`).join("\n") : "- (기록 없음)",
    "",
    "죽은 후 3초 — 친구 초대?",
    sheet.invitedFriendWithin3s ? "YES" : "NO",
    "",
    "종료 — 스스로 한 판 더?",
    sheet.pressedOneMoreSelf ? "YES" : "NO",
    "",
    "재밌었다?",
    sheet.saidFun ? "YES" : "NO"
  );

  if (sheet.notes) lines.push("", "메모", sheet.notes);
  return lines.join("\n");
}

export function exportObservationSheetsText(): string {
  return loadObservationSheets().map(formatObservationSheet).join("\n\n---\n\n");
}

export function observationSheetTemplate(): string {
  return [
    "Observation Sheet",
    "",
    "플레이어: ___________",
    "세그먼트: self / dev / non_gamer / middle_school / elementary",
    "관찰자: ___________",
    "플레이: ___분",
    "",
    "0~5초 — 움직였는가?  YES / NO",
    "30초 — 먹이 집중 / 멍함 / 탐험",
    "",
    "재미 꺾임 — 언제?",
    "  ○ 10초  ○ 30초  ○ 1분  ○ 3분  ○ 끝까지 안깨짐",
    "재미 꺾임 — 왜?",
    "  ○ 먹이 없음  ○ 사람 없음  ○ 너무 쉬움  ○ 너무 어려움",
    "  ○ 죽고 재미없음  ○ 목표 없음  ○ 기타",
    "",
    "첫 사망:",
    "  [ ] 욕  [ ] 웃음  [ ] 바로 종료  [ ] 관전",
    "",
    "죽은 후 3초 — 친구 초대?  YES / NO",
    "종료 — 스스로 한 판 더?  YES / NO",
    "재밌었다?  YES / NO",
    "",
    "메모:",
  ].join("\n");
}

export function loadBlindTests(): BlindTestEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BLIND_KEY);
    return raw ? (JSON.parse(raw) as BlindTestEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendBlindTest(entry: Omit<BlindTestEntry, "id" | "at"> & { at?: string }): BlindTestEntry {
  const tests = loadBlindTests();
  const item: BlindTestEntry = {
    id: (tests[0]?.id ?? 0) + 1,
    at: entry.at ?? new Date().toISOString(),
    playerLabel: entry.playerLabel,
    chose: entry.chose,
  };
  tests.unshift(item);
  if (typeof window !== "undefined") {
    localStorage.setItem(BLIND_KEY, JSON.stringify(tests.slice(0, 50)));
  }
  return item;
}

export function getBlindTestSummary(): { replayRate: number; sampleSize: number; pass: boolean } {
  const tests = loadBlindTests();
  if (tests.length === 0) return { replayRate: 0, sampleSize: 0, pass: false };
  const replay = tests.filter((t) => t.chose === "replay").length;
  const rate = replay / tests.length;
  return {
    replayRate: rate,
    sampleSize: tests.length,
    pass: tests.length >= 5 && rate >= PLAYTEST_MERGE_GATES.blindReplayRate,
  };
}

export function loadStrangerTests(): StrangerTestEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STRANGER_KEY);
    return raw ? (JSON.parse(raw) as StrangerTestEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendStrangerTest(entry: Omit<StrangerTestEntry, "id" | "at"> & { at?: string }): StrangerTestEntry {
  const tests = loadStrangerTests();
  const item: StrangerTestEntry = {
    id: (tests[0]?.id ?? 0) + 1,
    at: entry.at ?? new Date().toISOString(),
    observer: entry.observer,
    targetLabel: entry.targetLabel,
    thoughtHuman: entry.thoughtHuman,
    notes: entry.notes,
  };
  tests.unshift(item);
  if (typeof window !== "undefined") {
    localStorage.setItem(STRANGER_KEY, JSON.stringify(tests.slice(0, 100)));
  }
  return item;
}

export function getStrangerTestSummary(): { humanRate: number; sampleSize: number; pass: boolean } {
  const tests = loadStrangerTests();
  if (tests.length === 0) return { humanRate: 0, sampleSize: 0, pass: false };
  const human = tests.filter((t) => t.thoughtHuman).length;
  const rate = human / tests.length;
  return {
    humanRate: rate,
    sampleSize: tests.length,
    pass: tests.length >= 5 && rate >= PLAYTEST_MERGE_GATES.aiHumanRate,
  };
}

export interface ObservationGateStatus {
  pass: boolean;
  saidFunRate: number;
  oneMoreSelfRate: number;
  movedImmediatelyRate: number;
  inviteRate: number;
  sheetCount: number;
  postDeathKpi: ReturnType<typeof getPostDeathActionSummary>;
  blindTest: ReturnType<typeof getBlindTestSummary>;
  strangerTest: ReturnType<typeof getStrangerTestSummary>;
  blockers: string[];
}

export function evaluateObservationGates(): ObservationGateStatus {
  const sheets = loadObservationSheets();
  const n = sheets.length;
  const saidFunRate = n ? sheets.filter((s) => s.saidFun).length / n : 0;
  const oneMoreSelfRate = n ? sheets.filter((s) => s.pressedOneMoreSelf).length / n : 0;
  const movedImmediatelyRate = n ? sheets.filter((s) => s.movedImmediately).length / n : 0;
  const observedInvite = n ? sheets.filter((s) => s.invitedFriendWithin3s).length / n : 0;
  const postDeathKpi = getPostDeathActionSummary();
  const inviteRate = Math.max(observedInvite, postDeathKpi.invite);
  const blindTest = getBlindTestSummary();
  const strangerTest = getStrangerTestSummary();

  const blockers: string[] = [];
  if (n < PLAYTEST_MERGE_GATES.minObservationSheets) {
    blockers.push(`Observation Sheet ${n}개 < ${PLAYTEST_MERGE_GATES.minObservationSheets}개`);
  }
  if (n >= 3 && saidFunRate < PLAYTEST_MERGE_GATES.saidFunRate) {
    blockers.push(`"재밌었다" ${(saidFunRate * 100).toFixed(0)}% < ${(PLAYTEST_MERGE_GATES.saidFunRate * 100).toFixed(0)}%`);
  }
  if (strangerTest.sampleSize >= 5 && !strangerTest.pass) {
    blockers.push(`Stranger Test 사람 판정 ${(strangerTest.humanRate * 100).toFixed(0)}% < 50%`);
  }

  return {
    pass: blockers.length === 0 && n >= PLAYTEST_MERGE_GATES.minObservationSheets,
    saidFunRate,
    oneMoreSelfRate,
    movedImmediatelyRate,
    inviteRate,
    sheetCount: n,
    postDeathKpi,
    blindTest,
    strangerTest,
    blockers,
  };
}

export const PlaytestObservation = {
  append: appendObservationSheet,
  load: loadObservationSheets,
  format: formatObservationSheet,
  export: exportObservationSheetsText,
  template: observationSheetTemplate,
  gates: evaluateObservationGates,
  postDeathKpi: getPostDeathActionSummary,
  blind: {
    append: appendBlindTest,
    load: loadBlindTests,
    summary: getBlindTestSummary,
  },
  stranger: {
    append: appendStrangerTest,
    load: loadStrangerTests,
    summary: getStrangerTestSummary,
  },
};
