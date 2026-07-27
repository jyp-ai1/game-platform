"use client";

import { Button, cn } from "@game-platform/ui";

import {
  SNAKE_HEAD_CHARACTERS,
  SNAKE_HEAD_IDS,
  type SnakeHeadId,
} from "./snake-characters";

export function SnakeCharacterSelect({
  value,
  onChange,
  onConfirm,
}: {
  value: SnakeHeadId;
  onChange: (id: SnakeHeadId) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 py-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Character</p>
        <h2 className="mt-1 text-xl font-bold">머리 캐릭터 선택</h2>
        <p className="mt-1 text-sm text-muted-foreground">Body는 동일 · 선택은 저장됩니다</p>
      </div>
      <div className="grid w-full grid-cols-5 gap-2 sm:gap-3">
        {SNAKE_HEAD_IDS.map((id) => {
          const c = SNAKE_HEAD_CHARACTERS[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-2 transition sm:p-3",
                selected
                  ? "border-violet-400 bg-violet-500/20 ring-2 ring-violet-400/60"
                  : "border-white/10 bg-muted/30 hover:border-white/25"
              )}
              aria-pressed={selected}
            >
              <span className="text-2xl sm:text-3xl" aria-hidden>
                {c.emoji}
              </span>
              <span className="text-[9px] font-medium text-muted-foreground sm:text-[10px]">{c.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-4xl">{SNAKE_HEAD_CHARACTERS[value].emoji}</p>
        <Button
          size="lg"
          className="h-14 min-w-[220px] text-base font-bold bg-violet-600 hover:bg-violet-500"
          onClick={onConfirm}
        >
          START
        </Button>
        <p className="text-xs text-muted-foreground">Press Start</p>
      </div>
    </div>
  );
}
