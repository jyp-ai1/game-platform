"use client";

import { useEffect, useState } from "react";

import { cn } from "./lib/utils";

const STEPS = ["3", "2", "1", "GO!"] as const;
const STEP_MS = 650;

export function ReadyCountdown({
  onComplete,
  className,
}: {
  onComplete: () => void;
  className?: string;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) {
      onComplete();
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [step, onComplete]);

  if (step >= STEPS.length) {
    return null;
  }

  const label = STEPS[step]!;
  const isGo = label === "GO!";

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/85 backdrop-blur-sm",
        className
      )}
      aria-live="polite"
      aria-label="게임 시작 카운트다운"
    >
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Ready
      </p>
      <p
        key={label}
        className={cn(
          "animate-in zoom-in-50 fade-in duration-300 font-bold tabular-nums",
          isGo ? "text-4xl text-primary" : "text-5xl"
        )}
      >
        {label}
      </p>
    </div>
  );
}
