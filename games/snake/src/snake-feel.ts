/** Snake feel — audio, particles, screen shake (Replay-only juice) */
import { SNAKE_FEEL } from "./snake-feel-tuning";

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

let particleId = 0;
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

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.08): void {
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

export function playEatSound(kind: string, hz?: number): void {
  tone(hz ?? (kind === "golden_apple" ? SNAKE_FEEL.goldenEatHz : SNAKE_FEEL.eatSoundBaseHz), 0.08, "sine", 0.08);
}

export function playRareFoodSound(): void {
  tone(SNAKE_FEEL.rareFoodHz, 0.12, "sine", 0.1);
  setTimeout(() => tone(SNAKE_FEEL.rareFoodHz + 180, 0.08, "triangle", 0.07), 60);
}

export function playRankUpSound(): void {
  tone(SNAKE_FEEL.rankUpHz, 0.1, "square", 0.09);
  setTimeout(() => tone(SNAKE_FEEL.rankUpHz + 220, 0.12, "sine", 0.08), 80);
}

export function playBoostSound(): void {
  tone(SNAKE_FEEL.boostSoundHz, 0.045, "triangle", 0.05);
}

export function playBoostEndSound(): void {
  tone(SNAKE_FEEL.boostSoundHz - 80, 0.035, "triangle", 0.04);
}

export function playDeathSound(): void {
  tone(110, 0.22, "sawtooth", 0.11);
  setTimeout(() => tone(70, 0.28, "sawtooth", 0.09), 90);
}

export function playKillSound(isFirst = false): void {
  if (isFirst) {
    tone(SNAKE_FEEL.killSoundHz, 0.08, "square", 0.12);
    setTimeout(() => tone(SNAKE_FEEL.killSoundHz + 260, 0.1, "sine", 0.1), 45);
  } else {
    tone(SNAKE_FEEL.killSoundHz - 40, 0.06, "square", 0.09);
  }
}

export function spawnEatParticles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number = SNAKE_FEEL.eatParticleCount
): Particle[] {
  const next = [...particles];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 1.8 + Math.random() * 2.2;
    next.push({
      id: ++particleId,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 1,
      maxLife: 1,
      size: 3 + Math.random() * 4,
    });
  }
  return next.slice(-100);
}

export function spawnBoostTrail(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  intensity = 1
): Particle[] {
  const next = [...particles];
  const count = Math.min(3, Math.ceil(intensity));
  for (let i = 0; i < count; i++) {
    next.push({
      id: ++particleId,
      x: x + (Math.random() - 0.5) * 0.3,
      y: y + (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      color,
      life: 0.85,
      maxLife: 0.85,
      size: 2.5 + Math.random() * 2.5,
    });
  }
  return next.slice(-120);
}

export interface ScorePopup {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

let popupId = 0;

export function spawnScorePopup(
  popups: ScorePopup[],
  x: number,
  y: number,
  text: string | number,
  color: string
): ScorePopup[] {
  return [
    ...popups,
    { id: ++popupId, x, y, text: typeof text === "number" ? `+${text}` : text, color, life: 1 },
  ].slice(-12);
}

export function tickScorePopups(popups: ScorePopup[]): ScorePopup[] {
  return popups
    .map((p) => ({ ...p, y: p.y - 0.04, life: p.life - 0.025 }))
    .filter((p) => p.life > 0);
}

export function spawnDeathBurst(
  particles: Particle[],
  x: number,
  y: number,
  color: string
): Particle[] {
  let next = [...particles];
  for (let i = 0; i < SNAKE_FEEL.deathParticleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    next.push({
      id: ++particleId,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 1,
      maxLife: 1,
      size: 3 + Math.random() * 5,
    });
  }
  return next.slice(-80);
}

export function tickParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.08,
      life: p.life - 0.04,
    }))
    .filter((p) => p.life > 0);
}

export function shakeIntensity(decay: number, impulse = 0): number {
  return Math.max(0, decay * 0.85 + impulse);
}
