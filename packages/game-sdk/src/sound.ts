import { isSoundEnabled } from "./local-storage";

// Procedural UI sound effects via the Web Audio API — no audio files, in
// keeping with the project's "every asset is generated, not sourced" rule.
// A single AudioContext is created lazily on the first call, always from
// inside a user-gesture handler (click/hover), so it never trips browser
// autoplay restrictions.
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  durationMs: number,
  { type = "sine" as OscillatorType, volume = 0.12, delayMs = 0 } = {}
): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const startAt = ctx.currentTime + delayMs / 1000;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationMs / 1000);
}

export function playHoverSound(): void {
  playTone(660, 60, { volume: 0.05 });
}

export function playClickSound(): void {
  playTone(880, 90, { volume: 0.1 });
}

export function playStartSound(): void {
  playTone(523.25, 90, { volume: 0.12 });
  playTone(783.99, 140, { volume: 0.12, delayMs: 90 });
}

export function playSuccessSound(): void {
  playTone(784, 90, { volume: 0.1 });
  playTone(988, 70, { volume: 0.08, delayMs: 60 });
}

export function playFailSound(): void {
  playTone(220, 140, { type: "triangle", volume: 0.09 });
}

export function playGameOverSound(): void {
  playTone(330, 180, { type: "triangle", volume: 0.1 });
  playTone(196, 260, { type: "triangle", volume: 0.08, delayMs: 100 });
}

export function playPopSound(): void {
  playTone(520, 55, { volume: 0.08 });
  playTone(780, 45, { volume: 0.06, delayMs: 25 });
}

export function playStageClearSound(): void {
  playTone(523.25, 100, { volume: 0.11 });
  playTone(659.25, 100, { volume: 0.1, delayMs: 80 });
  playTone(783.99, 140, { volume: 0.09, delayMs: 160 });
}

export function playComboSound(): void {
  playTone(880, 60, { volume: 0.09 });
  playTone(1108, 60, { volume: 0.08, delayMs: 50 });
  playTone(1318, 80, { volume: 0.07, delayMs: 100 });
}

export function playMergeSound(): void {
  playTone(440, 70, { volume: 0.1 });
  playTone(660, 90, { volume: 0.09, delayMs: 40 });
  playTone(880, 60, { volume: 0.07, delayMs: 90 });
}

export function playFlipSound(): void {
  playTone(740, 50, { type: "triangle", volume: 0.07 });
  playTone(520, 40, { type: "triangle", volume: 0.05, delayMs: 35 });
}

export function playCorrectSound(): void {
  playTone(880, 80, { volume: 0.09 });
  playTone(1174, 60, { volume: 0.07, delayMs: 70 });
}

export function playLineClearSound(): void {
  playTone(523, 80, { volume: 0.1 });
  playTone(784, 80, { volume: 0.09, delayMs: 60 });
  playTone(1046, 100, { volume: 0.08, delayMs: 120 });
}

export function playExplosionSound(): void {
  playTone(180, 200, { type: "sawtooth", volume: 0.08 });
  playTone(120, 280, { type: "sawtooth", volume: 0.06, delayMs: 80 });
}

export function playFlagSound(): void {
  playTone(620, 60, { volume: 0.07 });
}

export function playGoalSound(): void {
  playTone(660, 100, { volume: 0.11 });
  playTone(880, 120, { volume: 0.1, delayMs: 90 });
  playTone(1108, 140, { volume: 0.08, delayMs: 180 });
}
