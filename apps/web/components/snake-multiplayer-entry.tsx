"use client";

import {
  getGlobalWorldStatus,
  GLOBAL_WORLD_TARGET,
  quickPlayGlobal,
} from "@game-platform/multiplayer-sdk";
import { createParty } from "@game-platform/replay-engine/social";
import { Button, cn } from "@game-platform/ui";
import { Users, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createRoom } from "@/lib/multiplayer-rooms";

type EntryVariant = "hero" | "detail" | "card";

export function SnakeMultiplayerEntry({
  variant = "detail",
  className,
}: {
  variant?: EntryVariant;
  className?: string;
}) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [liveCount, setLiveCount] = useState(GLOBAL_WORLD_TARGET);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    setLiveCount(getGlobalWorldStatus("snake").live);
  }, []);

  const handleQuickPlay = useCallback(async () => {
    setJoining(true);
    try {
      const { href } = await quickPlayGlobal("snake");
      router.push(href);
    } catch {
      router.push("/flagship/snake-io/play?room=WORLD");
    } finally {
      setJoining(false);
    }
  }, [router]);

  async function handleParty() {
    const party = await createParty();
    router.push(`/p/${party.id}`);
  }

  function handleCreateRoom() {
    const room = createRoom("snake", 4);
    setRoomCode(room.code);
    router.push(`/flagship/snake-io/play?room=${room.code}`);
  }

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={handleQuickPlay}
        disabled={joining}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border border-emerald-500/50 bg-emerald-500/15 px-5 py-5 text-left transition hover:border-emerald-400/70 disabled:opacity-70",
          className
        )}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/90">🔥 LIVE</p>
          <p className="mt-1 text-xl font-bold text-emerald-100">Snake.io</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {liveCount} / {GLOBAL_WORLD_TARGET} Players
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-emerald-950">
          {joining ? "입장 중…" : "바로 참가 →"}
        </span>
      </button>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Button size="sm" className="w-full gap-1" onClick={handleQuickPlay} disabled={joining}>
          <Zap className="size-3.5" />
          {joining ? "입장 중…" : "바로 참가"}
        </Button>
        <Button size="sm" variant="outline" className="w-full gap-1" onClick={handleParty}>
          <Users className="size-3.5" /> Party
        </Button>
      </div>
    );
  }

  return (
    <section className={cn("rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">🔥 LIVE · Snake.io</p>
        <p className="mt-1 text-lg font-bold">
          {liveCount} / {GLOBAL_WORLD_TARGET} Players
        </p>
        <p className="text-sm text-muted-foreground">Global World · 즉시 입장</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleQuickPlay} disabled={joining} className="gap-2">
          <Zap className="size-4" /> {joining ? "입장 중…" : "Quick Play"}
        </Button>
        <Button variant="outline" onClick={handleParty} className="gap-2">
          <Users className="size-4" /> Party
        </Button>
        <Button variant="outline" onClick={handleCreateRoom}>
          Create Room
        </Button>
      </div>
      {roomCode ? <p className="mt-2 text-xs text-muted-foreground">Room {roomCode}</p> : null}
      <p className="mt-3 text-xs text-muted-foreground">
        아래는 혼자 연습 모드 ·{" "}
        <Link href="/flagship/snake-io" className="text-primary underline-offset-2 hover:underline">
          Flagship 허브
        </Link>
      </p>
    </section>
  );
}

export function SnakeFriendJoinEntry({
  nickname,
  href,
  label,
  className,
}: {
  nickname: string;
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border border-primary/40 bg-primary/15 px-5 py-5 transition hover:border-primary/60",
        className
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">👥 친구</p>
        <p className="mt-1 text-xl font-bold">{nickname}가 플레이중</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
      </div>
      <span className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
        같이하기 →
      </span>
    </Link>
  );
}

export function SnakeLiveBadge() {
  const [liveCount, setLiveCount] = useState(GLOBAL_WORLD_TARGET);
  useEffect(() => {
    setLiveCount(getGlobalWorldStatus("snake").live);
  }, []);
  return (
    <span className="rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-950">
      🟢 LIVE · {liveCount}
    </span>
  );
}
