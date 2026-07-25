"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

/** Operations Gate — 5-minute operator snapshot. */
export function OperationsGatePanel() {
  const data = getReleaseDashboardData();
  const [bugs, setBugs] = useState(0);
  const [comments, setComments] = useState(0);

  useEffect(() => {
    import("@/lib/community-store").then((m) => {
      setBugs(m.listBugReports().length);
      setComments(m.listComments().length);
    });
  }, []);

  const brokenGames =
    data.games?.filter((g) => g.status && g.status !== "ok").length ?? 0;
  const topGame = data.predictedTop10?.[0]?.slug ?? "—";

  const items = [
    {
      label: "Broken Games",
      value: brokenGames === 0 ? "0 ✓" : `${brokenGames} ⚠`,
      href: "/admin/health",
      warn: brokenGames > 0,
    },
    {
      label: "Top Game",
      value: topGame,
      href: "/admin/health",
      warn: false,
    },
    {
      label: "Recent Bugs",
      value: String(bugs),
      href: "/admin/operations",
      warn: bugs > 2,
    },
    {
      label: "Recent Comments",
      value: String(comments),
      href: "/community",
      warn: false,
    },
    {
      label: "Session / RC",
      value: `${data.rc1Score}% · ${data.playable}/50`,
      href: "/admin/health",
      warn: data.rc1Score < 95,
    },
    {
      label: "Deploy",
      value: data.branch ?? "content-factory",
      href: "/admin/operations",
      warn: false,
    },
  ];

  return (
    <section className="replay-panel rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Operations Gate (5 min)</h2>
        <span className="text-xs text-muted-foreground">Live snapshot</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-xl border px-3 py-3 transition-colors hover:border-primary/40 ${
              item.warn ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-card/40"
            }`}
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 truncate font-semibold">{item.value}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
