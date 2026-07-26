"use client";

import { getDailyStreak } from "@game-platform/game-sdk";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  refreshMotivationNotifications,
  subscribeNotifications,
} from "@game-platform/replay-engine";

/** Notification center — action-driving alerts. */
export function NotificationCenter({ compact = false }: { compact?: boolean }) {
  const unread = useSyncExternalStore(subscribeNotifications, getUnreadCount, () => 0);
  const items = useSyncExternalStore(subscribeNotifications, () => getNotifications(true), () => []);

  useEffect(() => {
    const streak = getDailyStreak();
    const today = new Date().toISOString().slice(0, 10);
    const playedToday = streak.lastPlayedDate === today;
    refreshMotivationNotifications({
      streakDays: streak.currentStreak,
      streakAtRisk: streak.currentStreak > 0 && !playedToday,
      missionRemaining: 1,
    });
  }, []);

  if (compact && items.length === 0) return null;

  const show = compact ? items.slice(0, 2) : items;

  return (
    <section className="rounded-2xl border border-white/10 bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Notifications {unread > 0 ? `(${unread})` : ""}</h2>
        {unread > 0 ? (
          <button type="button" onClick={markAllRead} className="text-xs text-primary hover:underline">
            모두 읽음
          </button>
        ) : null}
      </div>
      {show.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">알림 없음</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {show.map((n) => (
            <li key={n.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
              <p className="font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.body}</p>
              <div className="mt-2 flex gap-2">
                <Link href={n.href} onClick={() => markRead(n.id)} className="text-xs font-medium text-primary hover:underline">
                  {n.cta} →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
