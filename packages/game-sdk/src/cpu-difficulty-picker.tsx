"use client";

import { Button, cn } from "@game-platform/ui";

import type { CpuDifficulty } from "./board-game-status";

const LABELS: Record<CpuDifficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

export function CpuDifficultyPicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: CpuDifficulty;
  onChange: (d: CpuDifficulty) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)} role="group" aria-label="Difficulty">
      {(["easy", "normal", "hard"] as const).map((d) => (
        <Button
          key={d}
          type="button"
          size="sm"
          variant={value === d ? "default" : "outline"}
          disabled={disabled}
          onClick={() => onChange(d)}
        >
          {LABELS[d]}
        </Button>
      ))}
    </div>
  );
}
