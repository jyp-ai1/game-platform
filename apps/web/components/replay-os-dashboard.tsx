"use client";

import Link from "next/link";

import { getOverallOSCompletion, REPLAY_OS, REPLAY_PLATFORMS } from "@/lib/replay-os/os-definitions";

/** Replay OS 2.0 — Company dashboard (8 Platforms · 6 OS). */
export function ReplayOsDashboard({ admin = false }: { admin?: boolean }) {
  const overall = getOverallOSCompletion();

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-widest text-violet-400">Replay OS 2.0</p>
        <h1 className="mt-1 text-2xl font-bold">Game Operating System</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          8 Platforms · 6 OS · Overall {overall}%
        </p>
      </div>

      <section>
        <h2 className="font-semibold">6 Operating Systems</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPLAY_OS.map((os) => (
            <Link
              key={os.id}
              href={admin ? os.href : os.href}
              className="rounded-2xl border border-white/10 bg-card/50 p-5 transition hover:border-violet-500/30"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{os.label}</p>
                <span className="text-sm font-bold tabular-nums text-primary">{os.completion}%</span>
              </div>
              <p className="mt-1 text-xs text-violet-400">{os.mission}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {os.modules.slice(0, 4).map((m) => (
                  <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{m}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">8 Platforms</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REPLAY_PLATFORMS.map((p) => (
            <Link key={p.id} href={p.href} className="rounded-xl border border-white/10 p-4 text-sm hover:border-primary/25">
              <p className="font-medium">{p.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {admin ? (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="font-semibold">Operation OS — 5분 룰틴</h2>
          <ol className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>1. Health Dashboard → RC Score</li>
            <li>2. AI Operation Center → pending issues</li>
            <li>3. Release Dashboard → gate status</li>
            <li>4. Metrics → DAU / retention delta</li>
            <li>5. Deploy queue → approve or rollback</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/health" className="rounded-lg border px-3 py-1.5 text-xs">Health</Link>
            <Link href="/admin/operations" className="rounded-lg border px-3 py-1.5 text-xs">AI Ops</Link>
            <Link href="/admin/release-dashboard" className="rounded-lg border px-3 py-1.5 text-xs">Release</Link>
            <Link href="/admin/analytics" className="rounded-lg border px-3 py-1.5 text-xs">Metrics</Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
