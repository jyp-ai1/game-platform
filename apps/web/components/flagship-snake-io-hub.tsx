"use client";

import { createRoom, getPartyLinkUrl } from "@game-platform/multiplayer-sdk";
import { Button } from "@game-platform/ui";
import { Share2, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/** Flagship — Replay Snake.io entry (P0). */
export function FlagshipSnakeIoHub() {
  const [code, setCode] = useState<string | null>(null);

  function handleQuickPlay() {
    const room = createRoom("snake", 20, "public");
    setCode(room.code);
  }

  async function handleShare() {
    if (!code) return;
    const url = getPartyLinkUrl(code);
    if (navigator.share) {
      await navigator.share({ title: "Replay Snake.io", url, text: "친구와 Snake.io!" });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-10">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-primary">Flagship · P0</p>
        <h1 className="mt-2 text-4xl font-bold">Replay Snake.io</h1>
        <p className="mt-2 text-muted-foreground">20명 · 실시간 · 먹이 · 랭킹 · 친구 초대</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Users} label="Players" value="Up to 20" />
        <Stat icon={Zap} label="Mode" value="Realtime" />
        <Stat icon={Share2} label="Social" value="Party Link" />
      </div>

      {!code ? (
        <div className="flex flex-col items-center gap-4">
          <Button size="lg" onClick={handleQuickPlay} className="gap-2">
            <Zap className="size-5" /> Quick Match
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/p/DEMO">Join Party</Link>} />
        </div>
      ) : (
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center">
          <p className="text-sm text-muted-foreground">Room Code</p>
          <p className="mt-2 text-4xl font-bold tracking-widest text-primary">{code}</p>
          <p className="mt-4 text-sm">{getPartyLinkUrl(code)}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button nativeButton={false} render={<Link href={`/p/${code}`}>Enter Lobby</Link>} />
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="size-4" /> Invite Friends
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href={`/flagship/snake-io/play?room=${code}`}>Play →</Link>} />
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        From <Link href="/labs" className="text-primary hover:underline">Replay Labs</Link> · Cross-device transport in progress (ADR-003)
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4 text-center">
      <Icon className="mx-auto size-5 text-primary" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
