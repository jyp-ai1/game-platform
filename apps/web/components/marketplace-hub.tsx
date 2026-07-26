"use client";

import { useState } from "react";

import { getMarketplaceByType, type MarketplaceItemType } from "@/lib/creator/creator-revenue";

const TABS: { id: MarketplaceItemType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "game", label: "Games" },
  { id: "template", label: "Templates" },
  { id: "asset", label: "Assets" },
  { id: "music", label: "Music" },
  { id: "sprite", label: "Sprites" },
  { id: "ui", label: "UI Kit" },
  { id: "ai-prompt", label: "AI Prompt" },
  { id: "npc", label: "NPC" },
  { id: "effect", label: "Effects" },
  { id: "background", label: "Backgrounds" },
  { id: "icon", label: "Icons" },
  { id: "shader", label: "Shaders" },
];

export function MarketplaceHub() {
  const [tab, setTab] = useState<MarketplaceItemType | "all">("all");
  const items = getMarketplaceByType(tab);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Replay Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Games · Templates · Assets · Music · Sprites · UI · AI · NPC · Effects · Backgrounds · Icons · Shaders
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-card/50 p-5">
            <p className="text-xs uppercase text-muted-foreground">{item.type}</p>
            <p className="mt-1 font-semibold">{item.title}</p>
            <p className="text-sm text-muted-foreground">by {item.author}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>{item.currency === "free" ? "Free" : `${item.price} coins`}</span>
              <span className="text-muted-foreground">★ {item.rating} · {item.downloads} dl</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
