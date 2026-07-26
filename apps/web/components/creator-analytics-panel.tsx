"use client";

import Link from "next/link";

import { getMyCreatorGames } from "@/lib/creator/creator-store";
import { getCreatorAnalytics, getAnalyticsInsights } from "@/lib/creator/creator-analytics";
import { useMounted } from "@/lib/use-mounted";

export function CreatorAnalyticsPanel() {
  const mounted = useMounted();
  if (!mounted) return null;

  const games = getMyCreatorGames();
  const analytics = getCreatorAnalytics(games.length ? games.map((g) => ({ slug: g.slug, title: g.title })) : [{ slug: "demo", title: "Demo Game" }]);
  const insights = getAnalyticsInsights(analytics);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Developer Analytics</h1>
        <p className="text-sm text-muted-foreground">조회수 · 플레이 · 이탈률 · 재방문 · CTR · 좋아요 · 버그</p>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="p-3">Game</th>
              <th className="p-3">Views</th>
              <th className="p-3">Plays</th>
              <th className="p-3">Avg Time</th>
              <th className="p-3">Bounce</th>
              <th className="p-3">Return</th>
              <th className="p-3">Likes</th>
              <th className="p-3">Bugs</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((a) => (
              <tr key={a.gameSlug} className="border-b border-white/5">
                <td className="p-3 font-medium">{a.gameSlug}</td>
                <td className="p-3 tabular-nums">{a.views.toLocaleString()}</td>
                <td className="p-3 tabular-nums">{a.plays.toLocaleString()}</td>
                <td className="p-3">{a.avgSessionMin}m</td>
                <td className="p-3">{a.bounceRate}%</td>
                <td className="p-3">{a.returnRate}%</td>
                <td className="p-3">{a.likes}</td>
                <td className="p-3">{a.bugs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h2 className="font-semibold">AI Recommendations</h2>
        <ul className="mt-3 space-y-2">
          {insights.map((i) => (
            <li key={i.id} className="text-sm">
              <span className={i.severity === "warning" ? "text-amber-400" : "text-muted-foreground"}>{i.message}</span>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/studio/qa" className="text-sm text-primary hover:underline">AI Co-Developer → auto-fix PRs</Link>
    </div>
  );
}
