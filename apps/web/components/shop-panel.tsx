"use client";

import { Button } from "@game-platform/ui";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getCoins, subscribeCoins } from "@/lib/coins";
import { getOwnedItems, purchaseItem, SHOP_ITEMS, getSeasonPassProgress } from "@/lib/shop-store";

export function ShopPanel() {
  const coins = useSyncExternalStore(subscribeCoins, getCoins, () => 0);
  const [, refresh] = useState(0);
  const owned = getOwnedItems();
  const season = getSeasonPassProgress();

  return (
    <section className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-card/50 p-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Replay Shop</h3>
        <span className="ml-auto text-sm font-bold text-amber-400">{coins} coins</span>
      </div>

      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium">Season Pass — Level {season.level}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${season.percent}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SHOP_ITEMS.map((item) => {
          const has = owned.includes(item.id);
          return (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 p-3">
              <div>
                <span className="text-xl">{item.emoji}</span>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.price} coins</p>
              </div>
              <Button
                size="sm"
                variant={has ? "outline" : "default"}
                disabled={has}
                onClick={() => {
                  if (purchaseItem(item.id)) refresh((n) => n + 1);
                }}
              >
                {has ? "Owned" : "Buy"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
