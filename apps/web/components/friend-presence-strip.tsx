"use client";

import { ActivityEngine } from "@game-platform/replay-engine/social";
import { useMemo } from "react";

const GAME_LABEL: Record<string, string> = {
  snake: "Snake",
  "mini-golf": "Mini Golf",
  uno: "UNO",
  bomber: "Bomber",
};

function formatPresence(title: string, nickname: string, gameSlug: string): string {
  const game = GAME_LABEL[gameSlug] ?? gameSlug;
  if (title.includes("이동") || title.includes("시작")) return `${nickname}가 ${game} 시작`;
  if (title.includes("완료")) return `${nickname}가 ${game} 방금 끝냄`;
  if (title.includes("기다")) return `${nickname}가 기다립니다`;
  if (title.includes("복수")) return `${nickname}가 복수 신청`;
  return `${nickname}: ${title}`;
}

/** Friend presence — what friends are doing right now */
export function FriendPresenceStrip() {
  const items = useMemo(() => ActivityEngine.feed(6), []);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-card/40 px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">친구 지금</p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((a) => (
          <li key={a.id} className="truncate">
            · {formatPresence(a.title, a.nickname, a.gameSlug)}
          </li>
        ))}
      </ul>
    </div>
  );
}
