"use client";

import { BalanceEngine, recommendBalance } from "@game-platform/replay-engine/balance";
import { useEffect, useState } from "react";

/** Admin — AI Balance recommendations + heatmap summary */
export function MpBalancePanel() {
  const [rec, setRec] = useState<ReturnType<typeof recommendBalance> | null>(null);
  const [heatmap, setHeatmap] = useState<ReturnType<typeof BalanceEngine.heatmap.summarize> | null>(null);

  useEffect(() => {
    const history = BalanceEngine.analytics.history();
    const latest = history[0] ?? null;
    setRec(recommendBalance(BalanceEngine.compute("snake", latest?.playerCount ?? 8), latest));
    const cells = BalanceEngine.heatmap.build("snake");
    setHeatmap(BalanceEngine.heatmap.summarize(cells));
  }, []);

  if (!rec) return null;

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-5">
      <h2 className="font-semibold">AI Balance Engine</h2>
      <p className="mt-1 text-sm text-muted-foreground">{rec.reason}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-4 text-sm">
        <Metric label="Map expand" value={`+${rec.mapExpandPercent}%`} />
        <Metric label="Food" value={`+${rec.foodIncreasePercent}%`} />
        <Metric label="Respawn" value={`-${rec.respawnReduceMs}ms`} />
        <Metric label="Reward" value={`+${rec.rewardIncreasePercent}%`} />
      </div>
      {heatmap ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Heatmap · death hotspots {heatmap.deathHotspots.length} · food gaps {heatmap.foodGaps}
        </p>
      ) : null}
      <p className="mt-2 text-[10px] text-muted-foreground">Confidence {Math.round(rec.confidence * 100)}% · 운영자 승인 후 적용</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
