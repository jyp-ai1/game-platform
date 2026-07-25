"use client";

import { useEffect, useState } from "react";

import { getReleaseDashboardData } from "@/lib/get-release-dashboard";
import { HealthAiSummary } from "@/components/health-ai-summary";

/** Client-side ops snapshot — Track G. */
export function HealthCenterLive() {
  const [bugs, setBugs] = useState(0);
  const [comments, setComments] = useState(0);

  useEffect(() => {
    import("@/lib/community-store").then((m) => {
      setBugs(m.listBugReports().length);
      setComments(m.listComments().length);
    });
  }, []);

  const data = getReleaseDashboardData();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Errors", value: data.gates.regression?.status ?? "—", tone: "warn" },
        { label: "Bug Reports", value: String(bugs), tone: "default" },
        { label: "Comments", value: String(comments), tone: "default" },
        { label: "Performance", value: data.gates.loading?.status ?? "SKIP", tone: "warn" },
      ].map((s) => (
        <div key={s.label} className="replay-panel rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-2xl font-bold">{s.value}</p>
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-4">
        <HealthAiSummary />
      </div>
    </div>
  );
}
