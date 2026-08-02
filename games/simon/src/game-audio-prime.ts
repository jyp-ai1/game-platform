import {
  isSoundEnabled,
  playGameOverSound,
  playStageClearSound,
  playStartSound,
  setSoundEnabled,
} from "@game-platform/game-sdk";

import type { SimonColor } from "./engine";

let primed = false;
let audioCtx: AudioContext | null = null;

const PAD_FREQ: Record<SimonColor, number> = {
  red: 329.63,
  blue: 261.63,
  green: 392.0,
  yellow: 493.88,
};

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

function tone(freq: number, duration = 0.14, gain = 0.07): void {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
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

export function playPadTone(color: SimonColor): void {
  primeGameAudio();
  tone(PAD_FREQ[color]);
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
