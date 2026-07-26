"use client";

import { SnakeMultiplayerEntry } from "@/components/snake-multiplayer-entry";

/** Flagship — Global World entry (reuses home Quick Play) */
export function FlagshipSnakeIoHub() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10 px-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-primary">Global World</p>
        <h1 className="mt-2 text-4xl font-bold">Replay Snake.io</h1>
        <p className="mt-2 text-muted-foreground">홈과 동일 · Quick Play · Party · Create Room</p>
      </div>
      <SnakeMultiplayerEntry variant="detail" />
    </div>
  );
}
