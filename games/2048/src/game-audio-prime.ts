import {
  isSoundEnabled,
  playGameOverSound,
  playStageClearSound,
  playStartSound,
  setSoundEnabled,
} from "@game-platform/game-sdk";

let primed = false;
let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function tone(
  freq: number,
  duration = 0.14,
  gain = 0.07,
  type: OscillatorType = "sine"
): void {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

function toneSeq(
  notes: Array<{ freq: number; at: number; dur?: number; gain?: number }>
): void {
  for (const n of notes) {
    window.setTimeout(() => tone(n.freq, n.dur ?? 0.12, n.gain ?? 0.06), n.at);
  }
}

export function primeGameAudio(): void {
  if (!isSoundEnabled()) {
    setSoundEnabled(true);
  }
  if (!primed) {
    primed = true;
    playStartSound();
  }
}

export function playPopAudio(): void {
  primeGameAudio();
  tone(520, 0.08, 0.06);
}

export function playMatchAudio(): void {
  primeGameAudio();
  toneSeq([
    { freq: 440, at: 0 },
    { freq: 660, at: 60, dur: 0.14 },
  ]);
}

export function playWrongAudio(): void {
  primeGameAudio();
  tone(180, 0.18, 0.07, "triangle");
}

export function playComboAudio(): void {
  primeGameAudio();
  toneSeq([
    { freq: 523, at: 0, dur: 0.1 },
    { freq: 659, at: 70, dur: 0.1 },
    { freq: 784, at: 140, dur: 0.12 },
  ]);
}

export function playScoreAudio(): void {
  primeGameAudio();
  tone(880, 0.1, 0.05);
}

export function playMergeAudio(): void {
  primeGameAudio();
  toneSeq([
    { freq: 330, at: 0, dur: 0.1 },
    { freq: 440, at: 50, dur: 0.12 },
  ]);
}

export function playStageClearAudio(): void {
  primeGameAudio();
  playStageClearSound();
}

export function playGameOverAudio(): void {
  primeGameAudio();
  playGameOverSound();
}

export function resetGameAudioPrime(): void {
  primed = false;
}
