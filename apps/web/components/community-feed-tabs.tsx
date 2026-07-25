"use client";

import type { Game } from "@game-platform/shared";
import { useState } from "react";

import { CommunityTrending } from "@/components/community-trending";
import { CommunityCommentsPanel } from "@/components/community-comments-panel";
import { LiveRankingPanel } from "@/components/live-ranking-panel";
import { replayCard } from "@/lib/replay-os";

type FeedTab = "hot" | "popular" | "latest" | "weekly" | "monthly" | "event";

const TABS: { id: FeedTab; label: string }[] = [
  { id: "hot", label: "Hot" },
  { id: "popular", label: "Popular" },
  { id: "latest", label: "Latest" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "event", label: "Daily Challenge" },
];

export function CommunityFeedTabs({ games }: { games: Game[] }) {
  const [tab, setTab] = useState<FeedTab>("hot");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm transition-all ${
              tab === t.id ? "bg-primary text-primary-foreground shadow-lg" : replayCard("px-4 py-2")
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "hot" || tab === "popular" ? <CommunityTrending games={games} /> : null}
      {tab === "latest" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CommunityCommentsPanel games={games} />
        </div>
      ) : null}
      {tab === "weekly" || tab === "monthly" ? <LiveRankingPanel games={games} /> : null}
      {tab === "event" ? (
        <section className={replayCard("p-6 text-center")}>
          <p className="text-lg font-semibold">Daily Challenge Event</p>
          <p className="mt-2 text-sm text-muted-foreground">Complete missions across games today.</p>
        </section>
      ) : null}
    </div>
  );
}
