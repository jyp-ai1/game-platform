"use client";

import { getCoins, getServerCoinsSnapshot, subscribeCoins } from "@/lib/coins";
import { Coins } from "lucide-react";
import { useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";

export function ProfileCoinsBadge() {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const coins = useSyncExternalStore(subscribeCoins, getCoins, getServerCoinsSnapshot);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2">
      <Coins className="size-4 text-amber-400" />
      <span className="text-sm font-bold tabular-nums">{coins}</span>
      <span className="text-xs text-muted-foreground">Coins</span>
    </div>
  );
}
