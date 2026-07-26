"use client";

import { LOGIC_MODULES } from "@/lib/creator/logic-marketplace";

/** Logic Marketplace — Inventory, Save, Quest, etc. one-click plug-in. */
export function LogicMarketplacePanel() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Logic Marketplace</h1>
        <p className="text-sm text-muted-foreground">Inventory · Save · Achievement · Ads · Ranking · Stage · Quest — 클릭 한 번에 넣기</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LOGIC_MODULES.map((m) => (
          <div key={m.id} className="rounded-2xl border border-white/10 bg-card/50 p-5">
            <p className="font-semibold">{m.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
            <code className="mt-3 block rounded-lg bg-muted/50 px-2 py-1 text-xs text-violet-300">{m.sdkCall}</code>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span>{m.currency === "free" ? "Free" : `${m.price} coins`}</span>
              <span className="text-muted-foreground">{m.downloads} installs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
