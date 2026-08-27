"use client";

import { Button, cn } from "@game-platform/ui";
import { useEffect } from "react";

import {
  DEFAULT_MP_AI_DIFFICULTY,
  MP_AI_DIFFICULTIES,
  type MpAiDifficulty,
} from "./mp-difficulty";

export type MpStyleOption = {
  id: string;
  label: string;
  emoji: string;
  /** When set, color is part of character selection (no separate Color step). */
  color?: string;
};

export type { MpAiDifficulty };
export { DEFAULT_MP_AI_DIFFICULTY, MP_AI_DIFFICULTIES };

/** Shared player color palette for Snake / Agar / Bomber entry. */
export const MP_PLAYER_COLORS = [
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#fb7185",
  "#f97316",
  "#4ade80",
  "#eab308",
] as const;

function colorForStyle(
  styles: readonly MpStyleOption[],
  styleId: string,
  colors: readonly string[]
): string {
  const idx = styles.findIndex((s) => s.id === styleId);
  const style = styles[idx >= 0 ? idx : 0];
  if (style?.color) return style.color;
  return colors[(idx >= 0 ? idx : 0) % colors.length]!;
}

export function MultiplayerEntrySelect({
  title,
  subtitle,
  styles,
  styleId,
  onStyleChange,
  colors = MP_PLAYER_COLORS,
  color,
  onColorChange,
  difficulty = DEFAULT_MP_AI_DIFFICULTY,
  onDifficultyChange,
  onPlay,
  players,
  bots,
  roomCode,
  playLabel = "ENTER",
  showColorStep = false,
}: {
  title: string;
  subtitle?: string;
  styles: readonly MpStyleOption[];
  styleId: string;
  onStyleChange: (id: string) => void;
  colors?: readonly string[];
  color: string;
  onColorChange: (color: string) => void;
  difficulty?: MpAiDifficulty;
  onDifficultyChange?: (d: MpAiDifficulty) => void;
  onPlay: () => void;
  players?: number;
  bots?: number;
  roomCode?: string;
  playLabel?: string;
  /** PLATFORM-UX-CONTRACT-001 — Character includes color; no separate Color step. */
  showColorStep?: boolean;
}) {
  const selected = styles.find((s) => s.id === styleId) ?? styles[0];
  const embeddedColor = colorForStyle(styles, styleId, colors);

  useEffect(() => {
    if (!showColorStep && embeddedColor.toLowerCase() !== color.toLowerCase()) {
      onColorChange(embeddedColor);
    }
  }, [showColorStep, embeddedColor, color, onColorChange]);

  const displayColor = showColorStep ? color : embeddedColor;

  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 py-8"
      data-testid="mp-entry-lobby"
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Multiplayer</p>
        <h2 className="mt-1 text-xl font-bold">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        {(players != null || bots != null || roomCode) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {roomCode ? <span className="mr-2">Room {roomCode}</span> : null}
            {players != null ? <span className="mr-2">Players {players}</span> : null}
            {bots != null ? <span>Bots {bots}</span> : null}
          </p>
        )}
      </div>

      <div className="w-full space-y-2">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Character
        </p>
        <div className="grid w-full grid-cols-5 gap-2 sm:gap-3">
          {styles.map((s, i) => {
            const active = s.id === styleId;
            const swatch = s.color ?? colors[i % colors.length]!;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onStyleChange(s.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition sm:p-3",
                  active
                    ? "bg-cyan-500/20 ring-2 ring-cyan-400/60"
                    : "border-white/10 bg-muted/30 hover:border-white/25"
                )}
                style={active ? { borderColor: swatch } : undefined}
                aria-pressed={active}
              >
                <span
                  className="flex size-9 items-center justify-center rounded-full text-2xl sm:size-10 sm:text-3xl"
                  style={{ backgroundColor: `${swatch}33`, boxShadow: active ? `0 0 0 2px ${swatch}` : undefined }}
                  aria-hidden
                >
                  {s.emoji}
                </span>
                <span className="text-[9px] font-medium text-muted-foreground sm:text-[10px]">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showColorStep ? (
        <div className="w-full space-y-2">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Color
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {colors.map((c) => {
              const active = c.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColorChange(c)}
                  className={cn(
                    "size-8 rounded-full border-2 transition sm:size-9",
                    active ? "scale-110 border-white ring-2 ring-white/50" : "border-white/20 hover:border-white/50"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                  aria-pressed={active}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {onDifficultyChange ? (
        <div className="w-full space-y-2" data-testid="mp-ai-difficulty">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Difficulty
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {MP_AI_DIFFICULTIES.map((d) => {
              const active = d.id === difficulty;
              return (
                <button
                  key={d.id}
                  type="button"
                  data-testid={`mp-ai-${d.id}`}
                  onClick={() => onDifficultyChange(d.id)}
                  className={cn(
                    "min-h-11 min-w-[5.5rem] rounded-lg border px-3 py-2 text-xs font-semibold transition",
                    active
                      ? "border-cyan-400 bg-cyan-500/25 text-cyan-100 ring-2 ring-cyan-400/50"
                      : "border-white/10 bg-muted/30 text-muted-foreground hover:border-white/25"
                  )}
                  aria-pressed={active}
                  aria-label={`${d.label} difficulty`}
                >
                  <span aria-hidden>{d.emoji}</span> {d.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-2">
        <div
          className="flex size-16 items-center justify-center rounded-full border-2 border-white/30 text-3xl shadow-lg"
          style={{ backgroundColor: displayColor }}
          aria-hidden
        >
          {selected?.emoji ?? "?"}
        </div>
        <Button
          size="lg"
          className="h-14 min-h-12 min-w-[220px] text-base font-bold bg-cyan-600 hover:bg-cyan-500"
          onClick={onPlay}
          data-testid="mp-enter-world"
        >
          {playLabel}
        </Button>
      </div>
    </div>
  );
}
