/**
 * Growth Engine — retention reminders structure (Replay OS).
 * Push/email hooks are stubs until notification infra ships.
 */
const LAST_VISIT_KEY = "play29:last-visit";
const REMINDERS_KEY = "play29:growth-reminders";

export type GrowthTrigger = "inactive_7d" | "challenge_pending" | "mission_incomplete";

export interface GrowthReminder {
  id: string;
  trigger: GrowthTrigger;
  message: string;
  channel: "push" | "email" | "in_app";
  createdAt: string;
  sent: boolean;
}

export function recordVisit(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
}

export function daysSinceLastVisit(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LAST_VISIT_KEY);
  if (!raw) return 0;
  const diff = Date.now() - new Date(raw).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function readReminders(): GrowthReminder[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(REMINDERS_KEY) ?? "[]") as GrowthReminder[];
  } catch {
    return [];
  }
}

function writeReminders(list: GrowthReminder[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMINDERS_KEY, JSON.stringify(list.slice(0, 20)));
}

export function queueGrowthReminder(
  trigger: GrowthTrigger,
  message: string,
  channel: GrowthReminder["channel"] = "in_app"
): void {
  const list = readReminders();
  const id = `${trigger}-${Date.now()}`;
  list.unshift({ id, trigger, message, channel, createdAt: new Date().toISOString(), sent: false });
  writeReminders(list);
}

export function getPendingGrowthReminders(): GrowthReminder[] {
  return readReminders().filter((r) => !r.sent);
}

export function evaluateGrowthTriggers(opts: {
  missionsLeft: number;
  pendingChallenges: number;
}): GrowthReminder[] {
  const queued: GrowthReminder[] = [];
  const inactive = daysSinceLastVisit();

  if (inactive >= 7) {
    queueGrowthReminder(
      "inactive_7d",
      "7일 만에 돌아오셨네요! 오늘 미션부터 시작해보세요.",
      "email"
    );
    queued.push(...getPendingGrowthReminders().filter((r) => r.trigger === "inactive_7d"));
  }

  if (opts.pendingChallenges > 0) {
    queueGrowthReminder(
      "challenge_pending",
      `친구 도전장 ${opts.pendingChallenges}개 — 지금 받아보세요.`,
      "push"
    );
  }

  if (opts.missionsLeft > 0) {
    queueGrowthReminder(
      "mission_incomplete",
      `오늘 미션 ${opts.missionsLeft}개 남음 — 5분이면 끝나요.`,
      "in_app"
    );
  }

  return queued.length > 0 ? queued : getPendingGrowthReminders().slice(0, 3);
}
