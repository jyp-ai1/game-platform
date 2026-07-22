"use client";

import type { EngagementEvent } from "@game-platform/game-sdk";
import { cn } from "@game-platform/ui";
import { useEffect, useState } from "react";

function toastContent(event: EngagementEvent): {
  emoji: string;
  title: string;
  subtitle: string;
} {
  switch (event.type) {
    case "achievement-unlocked":
      return {
        emoji: "🏆",
        title: "업적 달성!",
        subtitle: `${event.nameKo} · +50 XP`,
      };
    case "level-up":
      return {
        emoji: "⭐",
        title: "레벨 업!",
        subtitle: `Lv.${event.newLevel} 달성`,
      };
    case "new-record":
      return {
        emoji: "🎉",
        title: "신기록 달성!",
        subtitle: `${event.score.toLocaleString()}점 · +15 XP`,
      };
    case "mission-completed":
      return {
        emoji: "✅",
        title: "미션 완료!",
        subtitle: `${event.title} · +${event.xp} XP`,
      };
    case "weekly-mission-completed":
      return {
        emoji: "🗓️",
        title: "주간 미션 완료!",
        subtitle: `${event.title} · +${event.xp} XP`,
      };
    case "daily-reward-claimed":
      return {
        emoji: "🎁",
        title:
          event.streakDay >= 7 ? "7일 연속 출석 보너스!" : "출석 보상 획득!",
        subtitle: `${event.streakDay}일차 · +${event.xp} XP`,
      };
  }
}

export function ToastItem({
  event,
  onDismiss,
}: {
  event: EngagementEvent;
  onDismiss: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const { emoji, title, subtitle } = toastContent(event);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), 3200);
    const removeTimer = setTimeout(onDismiss, 3500);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg duration-300",
        leaving && "animate-out fade-out slide-out-to-right-4 duration-200"
      )}
    >
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
