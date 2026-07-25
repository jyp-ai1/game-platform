/**
 * Replay OS 1.0 — unified design tokens & utility class names.
 * Project Phoenix Epic8.
 */
export const REPLAY_OS = {
  radius: {
    card: "rounded-2xl",
    panel: "rounded-3xl",
    button: "rounded-xl",
  },
  surface: {
    card: "border border-white/10 bg-card/60 backdrop-blur",
    elevated: "border border-primary/20 bg-gradient-to-br from-primary/10 via-card/90 to-card shadow-lg shadow-primary/5",
    glass: "border border-white/10 bg-background/40 backdrop-blur",
  },
  motion: {
    hover: "transition-all duration-200 hover:border-primary/30 hover:shadow-md",
    fadeIn: "animate-in fade-in duration-300",
    slideUp: "animate-in fade-in slide-in-from-bottom-4 duration-300",
  },
  typography: {
    label: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
    title: "text-2xl font-bold sm:text-3xl",
    stat: "text-3xl font-bold tabular-nums",
  },
} as const;

export function replayCard(className = ""): string {
  return `${REPLAY_OS.surface.card} ${REPLAY_OS.radius.panel} ${REPLAY_OS.motion.hover} ${className}`.trim();
}
