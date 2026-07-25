"use client";

import { Coins, Sparkles } from "lucide-react";

export function RuntimeRewardFlash({
  xp,
  coins,
  visible,
}: {
  xp: number;
  coins: number;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="animate-in zoom-in fade-in flex flex-col items-center gap-4 duration-300">
        <Sparkles className="size-12 text-primary animate-pulse" />
        <div className="flex gap-6">
          <div className="runtime-xp-float rounded-2xl bg-primary/20 px-6 py-4 text-center">
            <p className="text-3xl font-bold text-primary">+{xp}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">XP</p>
          </div>
          <div className="runtime-coin-float rounded-2xl bg-amber-500/20 px-6 py-4 text-center">
            <p className="flex items-center justify-center gap-1 text-3xl font-bold text-amber-400">
              <Coins className="size-6" />+{coins}
            </p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Coin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
