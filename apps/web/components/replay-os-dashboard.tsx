"use client";

import Link from "next/link";

import {
  ENGINE_DOD,
  getActiveLayer,
  getEngineDoDProgress,
  REPLAY_LAYERS,
  type LayerStatus,
} from "@/lib/replay-os/layer-definitions";

const STATUS_LABEL: Record<LayerStatus, string> = {
  done: "Done",
  in_progress: "In Progress",
  blocked: "Blocked",
  not_started: "Not Started",
};

const STATUS_COLOR: Record<LayerStatus, string> = {
  done: "text-emerald-400",
  in_progress: "text-amber-400",
  blocked: "text-red-400",
  not_started: "text-muted-foreground",
};

/** Layer stack dashboard — no fake percentages. */
export function ReplayOsDashboard({ admin = false }: { admin?: boolean }) {
  const active = getActiveLayer();
  const engine = getEngineDoDProgress();

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-widest text-violet-400">Replay OS</p>
        <h1 className="mt-1 text-2xl font-bold">The Operating System for Browser Games</h1>
        <p className="mt-1 text-sm text-muted-foreground">Build. Play. Share. Grow.</p>
        <p className="mt-2 text-sm">
          Active Layer: <span className="font-semibold text-primary">{active.id} {active.name}</span>
        </p>
      </div>

      <section>
        <h2 className="font-semibold">Layer Stack (L1 → L7)</h2>
        <p className="mt-1 text-xs text-muted-foreground">하위 Layer 완료 전 상위 Layer 작업 금지</p>
        <div className="mt-4 space-y-2">
          {[...REPLAY_LAYERS].reverse().map((layer) => (
            <div
              key={layer.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                layer.id === active.id ? "border-violet-500/40 bg-violet-500/5" : "border-white/10"
              }`}
            >
              <div>
                <span className="font-mono text-xs text-muted-foreground">{layer.id}</span>
                <span className="ml-2 font-medium">{layer.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{layer.scope.join(" · ")}</span>
              </div>
              <span className={`text-xs font-medium ${STATUS_COLOR[layer.status]}`}>
                {STATUS_LABEL[layer.status]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Engine Definition of Done</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {engine.done}/{engine.total} complete — measurable checklist only
        </p>
        <ul className="mt-4 space-y-2">
          {ENGINE_DOD.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-2 text-sm">
              <span className={item.done ? "text-emerald-400" : "text-muted-foreground"}>
                {item.done ? "☑" : "□"}
              </span>
              <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
              {item.rfc ? (
                <span className="ml-auto font-mono text-[10px] text-violet-400">{item.rfc}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {admin ? (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="font-semibold">L1 Operations — 5분 루틴</h2>
          <ol className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>1. Health → RC Score</li>
            <li>2. AI Ops → pending issues</li>
            <li>3. Release → gate status</li>
            <li>4. Metrics → retention</li>
            <li>5. Deploy → approve / rollback</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/health" className="rounded-lg border px-3 py-1.5 text-xs">Health</Link>
            <Link href="/admin/operations" className="rounded-lg border px-3 py-1.5 text-xs">AI Ops</Link>
            <Link href="/admin/release-dashboard" className="rounded-lg border px-3 py-1.5 text-xs">Release</Link>
            <Link href="/admin/analytics" className="rounded-lg border px-3 py-1.5 text-xs">Metrics</Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            RFC: <code>docs/rfc/</code> · ADR: <code>docs/adr/</code>
          </p>
        </section>
      ) : null}
    </div>
  );
}
