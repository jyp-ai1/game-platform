/** Shared fullscreen helpers for multiplayer play shells. */

export function getActiveFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function isViewportFullscreen(el: HTMLElement | null): boolean {
  if (!el) return false;
  const active = getActiveFullscreenElement();
  if (!active) return false;
  return active === el || el.contains(active) || active.contains(el);
}

async function tryRequestFullscreen(el: HTMLElement): Promise<boolean> {
  const req = el.requestFullscreen?.bind(el) as
    | ((opts?: FullscreenOptions) => Promise<void>)
    | undefined;
  const webkitReq = (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
    .webkitRequestFullscreen;

  if (req) {
    try {
      await req();
      if (getActiveFullscreenElement()) return true;
    } catch {
      /* try with options */
    }
    try {
      await req({ navigationUI: "hide" });
      if (getActiveFullscreenElement()) return true;
    } catch {
      /* fall through */
    }
  }
  if (webkitReq) {
    try {
      await webkitReq.call(el);
      if (getActiveFullscreenElement()) return true;
    } catch {
      /* fall through */
    }
  }
  return false;
}

export async function enterViewportFullscreen(el: HTMLElement): Promise<"native" | "pseudo"> {
  if (await tryRequestFullscreen(el)) return "native";
  if (typeof document !== "undefined" && document.documentElement) {
    if (await tryRequestFullscreen(document.documentElement)) return "native";
  }
  return "pseudo";
}

export async function exitViewportFullscreen(): Promise<void> {
  const exit = document.exitFullscreen?.bind(document);
  const webkitExit = (document as Document & { webkitExitFullscreen?: () => Promise<void> })
    .webkitExitFullscreen;
  try {
    if (exit && getActiveFullscreenElement()) await exit();
    else if (webkitExit && getActiveFullscreenElement()) await webkitExit.call(document);
  } catch {
    /* ignore */
  }
}
