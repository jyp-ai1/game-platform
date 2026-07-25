"use client";

import Link from "next/link";
import { ChevronRight, Map, Swords, Target, Trophy } from "lucide-react";

/** Post-game loop navigation — Result → Challenge → Journey → Mission → Next */
export function GameResultLoopNav({
  slug,
  recommendSlug,
  missionDone,
}: {
  slug: string;
  recommendSlug?: string;
  missionDone: boolean;
}) {
  const steps = [
    { icon: Trophy, label: "Result", href: `#`, active: true, disabled: true },
    {
      icon: Swords,
      label: "Challenge",
      href: `/community?challenge=${slug}`,
      active: false,
    },
    { icon: Map, label: "Journey", href: "/journey", active: false },
    {
      icon: Target,
      label: missionDone ? "Mission ✓" : "Mission",
      href: "/missions",
      active: false,
    },
    {
      icon: ChevronRight,
      label: "Next Game",
      href: recommendSlug ? `/games/${recommendSlug}` : "/games",
      active: false,
    },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Replay Loop
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {steps.map((s) =>
          s.disabled ? (
            <span
              key={s.label}
              className="flex items-center gap-1 rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary"
            >
              <s.icon className="size-3" /> {s.label}
            </span>
          ) : (
            <Link
              key={s.label}
              href={s.href}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-card/60 px-3 py-1.5 text-xs transition-colors hover:border-primary/40"
            >
              <s.icon className="size-3" /> {s.label}
            </Link>
          )
        )}
      </div>
    </div>
  );
}
