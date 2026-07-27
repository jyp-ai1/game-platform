"use client";

import { SnakeMultiplayerEntry } from "@/components/snake-multiplayer-entry";

/** Flagship — Global World entry */
export function FlagshipSnakeIoHub() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">🎮 Snake.io</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          다른 플레이어와 경쟁하며 가장 긴 뱀이 되어보세요.
          <br />
          보석을 먹고 성장하며 살아남으세요.
        </p>
      </div>
      <SnakeMultiplayerEntry variant="start" />
    </div>
  );
}
