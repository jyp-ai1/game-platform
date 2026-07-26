/** Snake feel — audio, particles, screen shake (Replay-only juice) */

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

export function playEatSound(kind: string): void {
  tone(kind === "golden_apple" ? 880 : 520, 0.06, "sine", 0.06);
}

export function playBoostSound(): void {
  tone(180, 0.04, "triangle", 0.04);
}

export function playDeathSound(): void {
  tone(120, 0.2, "sawtooth", 0.1);
  setTimeout(() => tone(80, 0.25, "sawtooth", 0.08), 80);
}

export function spawnEatParticles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count = 6
): Particle[] {
  const next = [...particles];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    next.push({
      id: ++particleId,
      x,
      y,
      vx: Math.cos(angle) * 2,
      vy: Math.sin(angle) * 2,
      color,
      life: 1,
      maxLife: 1,
      size: 4,
    });
  }
  return next.slice(-80);
}

export function spawnDeathBurst(
  particles: Particle[],
  x: number,
  y: number,
  color: string
): Particle[] {
  let next = [...particles];
  for (let i = 0; i < 24; i++) {
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
