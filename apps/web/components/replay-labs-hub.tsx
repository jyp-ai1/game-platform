"use client";

import Link from "next/link";

const LABS = [
  { id: "snake-io", label: "Replay Snake.io", status: "flagship", href: "/flagship/snake-io", desc: "20P · 실시간 · Party" },
  { id: "ai-opponent", label: "AI Opponent", status: "experiment", href: "/labs", desc: "AI vs Player" },
  { id: "voice", label: "Voice Chat", status: "experiment", href: "/labs", desc: "Room voice" },
  { id: "ghost", label: "Ghost Replay", status: "experiment", href: "/labs", desc: "Watch your best run" },
  { id: "boss", label: "Daily Boss", status: "experiment", href: "/labs", desc: "Server-wide boss" },
  { id: "tournament", label: "Tournament", status: "experiment", href: "/labs", desc: "Bracket mode" },
  { id: "replay-tv", label: "Replay TV", status: "concept", href: "/labs", desc: "Live spectate feed" },
];

/** Replay Labs — experiment here, promote what works. */
export function ReplayLabsHub() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-violet-400">Replay Labs</p>
        <h1 className="mt-1 text-2xl font-bold">실험실</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          반응 좋은 기능만 정식 승격. Flagship은 Labs에서 검증 후 Production.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LABS.map((lab) => (
          <Link
            key={lab.id}
            href={lab.href}
            className={`rounded-2xl border p-5 transition hover:border-primary/30 ${
              lab.status === "flagship" ? "border-primary/40 bg-primary/5" : "border-white/10 bg-card/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">{lab.label}</p>
              <span className={`text-[10px] uppercase ${
                lab.status === "flagship" ? "text-primary" : lab.status === "experiment" ? "text-amber-400" : "text-muted-foreground"
              }`}>
                {lab.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{lab.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
