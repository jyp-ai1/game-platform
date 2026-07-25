"use client";

import { useEffect, useState } from "react";

import { HealthAiSummary } from "@/components/health-ai-summary";
import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

export function AdminOpsLiveDashboard() {
  const [bugs, setBugs] = useState(0);
  const [comments, setComments] = useState(0);
  const data = getReleaseDashboardData();

  useEffect(() => {
    import("@/lib/community-store").then((m) => {
      setBugs(m.listBugReports().length);
      setComments(m.listComments().length);
    });
  }, []);

  const cards = [
    { label: "Today's Bugs", value: String(bugs), tone: bugs > 2 ? "warn" : "ok" },
    { label: "Today's Comments", value: String(comments), tone: "default" },
    { label: "RC Score", value: `${data.rc1Score}%`, tone: data.rc1Score >= 95 ? "ok" : "warn" },
    { label: "Release Ready", value: data.rc1Score >= 91 ? "Near" : "No", tone: "default" },
    { label: "Games OK", value: `${data.playable}/50`, tone: "ok" },
    { label: "Top Complaints", value: bugs >= 3 ? "Mobile UX" : "None", tone: "default" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="replay-panel rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <HealthAiSummary />
      <section className="replay-panel rounded-2xl p-5">
        <h2 className="font-semibold">GitHub Draft Issues</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>#[auto] Community mobile scroll on iOS — P2</li>
          <li>#[auto] Snake stage threshold tuning — P3</li>
          <li>#[auto] Ranking sync delay — P2</li>
        </ul>
      </section>
    </div>
  );
}
