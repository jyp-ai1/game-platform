"use client";

import type { FriendProfile } from "@game-platform/shared";
import { RELATION_LABELS } from "@game-platform/replay-engine/social";
import Link from "next/link";

/** Friend Passport — identity card with join/challenge/profile. */
export function FriendPassportCard({ friend, roomCode }: { friend: FriendProfile; roomCode?: string }) {
  const p = friend.passport;
  return (
    <div className="rounded-xl border border-white/10 bg-card/60 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">{friend.nickname}</p>
          <p className="text-xs text-primary">{p.title ?? RELATION_LABELS[friend.relation]}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Lv{p.level}
        </span>
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        <p>최근 7일 Replay {p.hoursPlayed7d}시간</p>
        {p.topPercentiles.snake ? <p>Snake Top{p.topPercentiles.snake}%</p> : null}
        {p.badges.slice(0, 2).map((b) => (
          <span key={b} className="mr-1 inline-block rounded bg-white/5 px-1.5 py-0.5">{b}</span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={roomCode ? `/p/${roomCode}` : "/flagship/snake-io"}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Join
        </Link>
        <Link href={`/community?friend=${friend.deviceId}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">
          Profile
        </Link>
      </div>
    </div>
  );
}
