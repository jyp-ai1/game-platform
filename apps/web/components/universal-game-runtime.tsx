"use client";

import { Button } from "@game-platform/ui";
import { Loader2, Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { getDifficultyLabel, getRuntimeConfig } from "@/lib/game-runtime-config";

type Phase = "loading" | "ready" | "tutorial" | "playing" | "paused";

const TUTORIAL_SEEN_KEY = "play29:runtime-tutorial-seen";

export function UniversalGameRuntime({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const config = getRuntimeConfig(slug);
  const [phase, setPhase] = useState<Phase>("loading");
  const [paused, setPaused] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setPhase("loading");
    setPaused(false);
    const seen = typeof window !== "undefined" && window.localStorage.getItem(`${TUTORIAL_SEEN_KEY}:${slug}`);
    setShowTutorial(!seen);

    const t = window.setTimeout(() => setPhase(seen ? "ready" : "tutorial"), 400);
    return () => window.clearTimeout(t);
  }, [slug]);

  function finishTutorial() {
    window.localStorage.setItem(`${TUTORIAL_SEEN_KEY}:${slug}`, "1");
    setShowTutorial(false);
    setPhase("ready");
  }

  if (phase === "loading") {
    return (
      <div className="flex aspect-square w-full max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-muted/30 backdrop-blur animate-in fade-in">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading…</p>
        <p className="text-xs text-muted-foreground">{getDifficultyLabel(slug)} · Runtime 2.0</p>
      </div>
    );
  }

  if (phase === "tutorial" && showTutorial) {
    return (
      <div className="flex aspect-square w-full max-w-sm flex-col items-center justify-center gap-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-card/90 p-6 backdrop-blur animate-in fade-in">
        <Sparkles className="size-8 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Tutorial</p>
        <p className="text-center text-sm">{config.tutorialHint}</p>
        {config.boss ? (
          <p className="text-xs text-amber-400">Boss: {config.boss.name} @ {config.boss.threshold.toLocaleString()}</p>
        ) : null}
        <Button size="sm" onClick={finishTutorial}>
          Got it — Start
        </Button>
      </div>
    );
  }

  if (phase === "ready") {
    return <ReadyOverlay onComplete={() => setPhase("playing")} />;
  }

  return (
    <div className="relative animate-in fade-in">
      {paused ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/90 backdrop-blur-sm">
          <Pause className="size-10 text-primary" />
          <p className="font-semibold">Paused</p>
          <Button size="sm" className="gap-2" onClick={() => setPaused(false)}>
            <Play className="size-4" /> Resume
          </Button>
        </div>
      ) : null}

      <button
        type="button"
        className="absolute right-2 top-2 z-10 rounded-full border border-white/10 bg-background/80 p-2 shadow-lg backdrop-blur transition-transform hover:scale-105"
        onClick={() => setPaused(true)}
        aria-label="Pause"
      >
        <Pause className="size-4" />
      </button>

      <div className={paused ? "pointer-events-none opacity-40" : ""}>{children}</div>
    </div>
  );
}

function ReadyOverlay({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }
    const t = window.setTimeout(() => setCount((c) => c - 1), 600);
    return () => window.clearTimeout(t);
  }, [count, onComplete]);

  return (
    <div className="flex aspect-square w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-card/80 backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ready</p>
      <p className="mt-2 text-6xl font-black tabular-nums text-primary transition-all">
        {count > 0 ? count : "GO!"}
      </p>
    </div>
  );
}
