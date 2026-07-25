"use client";

import { useEffect, useState } from "react";

import { getRecentActivity, type ActivityItem } from "@/lib/community-store";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString();
}

export function CommunityActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    setItems(getRecentActivity());
  }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h2 className="font-semibold">Recent Activity</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm"
            >
              <span>{item.label}</span>
              <span className="text-xs text-muted-foreground">{formatWhen(item.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
