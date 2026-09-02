/** Display-only mass formatting — internal sim values stay raw. */
export function formatAgarMass(mass: number): string {
  const n = Math.max(0, mass);
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${trimFixed(v, 2)}M`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    return `${trimFixed(v, 2)}K`;
  }
  return String(Math.round(n));
}

function trimFixed(value: number, digits: number): string {
  const s = value.toFixed(digits);
  return s.replace(/\.?0+$/, "");
}
