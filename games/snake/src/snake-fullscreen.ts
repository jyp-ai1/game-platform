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

/** Board size in px — fills viewport when fullscreen. */
export function measureGameBoardPx(
  opts: {
    fullscreen: boolean;
    containerWidth: number;
  }
): number {
  if (typeof window === "undefined") return 480;
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;

  if (opts.fullscreen) {
    return Math.max(280, Math.floor(Math.min(vw, vh)));
  }

  const cap = Math.min(opts.containerWidth || vw, vh * 0.65, 720);
  return Math.max(320, Math.floor(cap));
}
