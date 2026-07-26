"use client";

import { getDailyStreak } from "@game-platform/game-sdk";
import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { HomeEmptyLine } from "@/components/home-empty-line";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  refreshMotivationNotifications,
  subscribeNotifications,
} from "@game-platform/replay-engine";

const COMPACT_MIN_H = "min-h-[5.5rem]";

/** Notification — home compact with empty state. */
export function NotificationCenter({ compact = false }: { compact?: boolean }) {
  const unread = useSyncExternalStore(subscribeNotifications, getUnreadCount, () => 0);
  const items = useMemo(() => getNotifications(true), [unread]);

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

  if (compact && items.length === 0) {
    return (
      <HomeEmptyLine testId="notification-empty" className={COMPACT_MIN_H}>
        새로운 알림이 없습니다.
      </HomeEmptyLine>
    );
  }

  if (compact) {
    const first = items[0];
    const line = first?.title?.includes("미션")
      ? "오늘 미션 보상이 있습니다."
      : (first?.title ?? "오늘 미션 보상이 있습니다.");
    return (
      <Link
        href={first?.href ?? "/missions"}
        onClick={() => first && markRead(first.id)}
        aria-label={`알림: ${line}`}
        className={`motion-base block ${COMPACT_MIN_H} rounded-xl border border-white/10 bg-card/40 px-3 py-2.5 text-sm text-muted-foreground transition hover:border-primary/25 hover:text-foreground`}
      >
        🔔 {line}
      </Link>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-card/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Notifications {unread > 0 ? `(${unread})` : ""}
      </h2>
      {items.length === 0 ? (
        <HomeEmptyLine testId="notification-empty" className="mt-2">
          새로운 알림이 없습니다.
        </HomeEmptyLine>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((n) => (
            <li key={n.id} className="text-sm">
              <Link href={n.href} onClick={() => markRead(n.id)} className="hover:text-primary">
                🔔 {n.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
