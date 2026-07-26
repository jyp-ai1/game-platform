/**
 * Notification Engine — action-driving alerts (L2 DoD).
 * Friend overtake · Mission · Streak · Season
 */
import { emitSimple } from "../event-bus";

const STORAGE_KEY = "play29:notifications";
const MAX = 50;

export type NotificationKind =
  | "friend_overtake"
  | "mission"
  | "streak"
  | "season"
  | "challenge"
  | "party";

export interface ReplayNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  cta: string;
  href: string;
  createdAt: string;
  read: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function readAll(): ReplayNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReplayNotification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: ReplayNotification[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX)));
  listeners.forEach((fn) => fn());
}

function notifyChange(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNotifications(unreadOnly = false): ReplayNotification[] {
  const items = readAll();
  return unreadOnly ? items.filter((n) => !n.read) : items;
}

export function getUnreadCount(): number {
  return readAll().filter((n) => !n.read).length;
}

export function pushNotification(
  n: Omit<ReplayNotification, "id" | "createdAt" | "read">
): ReplayNotification {
  const entry: ReplayNotification = {
    ...n,
    id: `n-${Date.now()}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  writeAll([entry, ...readAll()]);
  emitSimple("growth:notification", { kind: n.kind, title: n.title }, "notification");
  return entry;
}

export function markRead(id: string): void {
  writeAll(readAll().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllRead(): void {
  writeAll(readAll().map((n) => ({ ...n, read: true })));
}

/** Seed action-driving notifications from platform state. */
export function refreshMotivationNotifications(ctx: {
  streakDays: number;
  streakAtRisk: boolean;
  missionRemaining: number;
  friendOvertake?: { name: string; gameSlug: string } | null;
}): void {
  const existing = readAll();
  const hasKind = (k: NotificationKind) =>
    existing.some((n) => n.kind === k && !n.read && Date.now() - new Date(n.createdAt).getTime() < 86400000);

  if (ctx.friendOvertake && !hasKind("friend_overtake")) {
    pushNotification({
      kind: "friend_overtake",
      title: `${ctx.friendOvertake.name}가 당신을 추월했습니다`,
      body: "재도전하고 순위를 되찾으세요.",
      cta: "재도전",
      href: `/games/${ctx.friendOvertake.gameSlug}`,
    });
  }
  if (ctx.streakAtRisk && ctx.streakDays > 0 && !hasKind("streak")) {
    pushNotification({
      kind: "streak",
      title: `Streak ${ctx.streakDays}일 종료 임박`,
      body: "오늘 안 하면 streak이 끊깁니다.",
      cta: "지금 플레이",
      href: "/",
    });
  }
  if (ctx.missionRemaining > 0 && !hasKind("mission")) {
    pushNotification({
      kind: "mission",
      title: `오늘 미션 ${ctx.missionRemaining}개 남음`,
      body: "완료하면 보너스 코인을 받습니다.",
      cta: "미션 보기",
      href: "/missions",
    });
  }
}

export const Notification = {
  push: pushNotification,
  list: getNotifications,
  unreadCount: getUnreadCount,
  markRead,
  markAllRead,
  subscribe: subscribeNotifications,
  refresh: refreshMotivationNotifications,
};
