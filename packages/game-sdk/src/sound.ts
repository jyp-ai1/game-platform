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
