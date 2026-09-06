"use client";

import type { BomberMissionProgress } from "./bomber-retention";

export function BomberMissionHud({ missions }: { missions: BomberMissionProgress[] }) {
  return (
    <div
      data-testid="bomber-mission-hud"
      className="pointer-events-none select-none rounded-lg border border-white/10 bg-black/55 px-2.5 py-2 text-[10px] text-white/85 backdrop-blur-sm"
    >
      <p className="mb-1 font-bold uppercase tracking-widest text-orange-300/90">Missions</p>
      {missions.map((m) => (
        <p key={m.id} className="tabular-nums leading-relaxed">
          {m.done ? "✓" : "○"} {m.emoji}{" "}
          <span className={m.done ? "text-emerald-300" : "text-white/75"}>
            {Math.min(m.current, m.target)}/{m.target}
          </span>
        </p>
      ))}
    </div>
  );
}
