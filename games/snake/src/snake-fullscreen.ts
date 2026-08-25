/** Fullscreen helpers — desktop API + mobile pseudo-fullscreen fallback. */

export function getActiveFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function isViewportFullscreen(el: HTMLElement | null): boolean {
  if (!el) return false;
  return getActiveFullscreenElement() === el;
}

export async function enterViewportFullscreen(el: HTMLElement): Promise<"native" | "pseudo"> {
  const req = el.requestFullscreen?.bind(el) as
    | ((opts?: FullscreenOptions) => Promise<void>)
    | undefined;
  const webkitReq = (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
    .webkitRequestFullscreen;

  if (req) {
    try {
      await req({ navigationUI: "hide" });
      return "native";
    } catch {
      /* fall through */
    }
  }
  if (webkitReq) {
    try {
      await webkitReq.call(el);
      return "native";
    } catch {
      /* fall through */
    }
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

/** Legacy square measure — kept for callers that only need one side. */
export function measureGameBoardPx(opts: {
  fullscreen: boolean;
  containerWidth: number;
}): number {
  const { w, h } = measureGameBoardRect(opts);
  return Math.min(w, h);
}

/** Board rect in px — fullscreen/world fills viewport; optional side HUD reserve (no fixed-px clip). */
export function measureGameBoardRect(opts: {
  fullscreen: boolean;
  containerWidth: number;
  /** Left+right HUD gutters so minimap/TOP10 sit beside play area without clipping. */
  sideHudPx?: number;
}): { w: number; h: number } {
  if (typeof window === "undefined") return { w: 480, h: 480 };
  const vv = window.visualViewport;
  const vw = Math.floor(vv?.width ?? window.innerWidth);
  const vh = Math.floor(vv?.height ?? window.innerHeight);
  const sideHud = Math.max(0, opts.sideHudPx ?? 0);

  if (opts.fullscreen) {
    return {
      w: Math.max(280, vw - sideHud),
      h: Math.max(280, vh),
    };
  }

  const availW = Math.max(280, (opts.containerWidth || vw) - sideHud);
  const side = Math.max(320, Math.floor(Math.min(availW, vh * 0.65, 720)));
  return { w: side, h: side };
}
