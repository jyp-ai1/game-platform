/** One engine enable + session XP per play-page visit (survives component remounts). */
let engineSessionActive = false;

export function claimEngineSession(): boolean {
  if (engineSessionActive) return false;
  engineSessionActive = true;
  return true;
}

export function resetEngineSession(): void {
  engineSessionActive = false;
}
