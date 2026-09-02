/** Agar room resolution — mirrors apps/web/lib/invite-link contract. */
export const AGAR_ACTIVE_ROOM_KEY = "play29:active-room";

const WORLD_ROOM = /^WORLD(-[A-Z0-9]+)?$/;

export function isAgarWorldRoom(code: string): boolean {
  return WORLD_ROOM.test(code.trim().toUpperCase());
}

export function pinAgarRoom(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AGAR_ACTIVE_ROOM_KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

/** Resolve room from URL + pinned storage; never mint a new code here. */
export function resolveAgarRoomCode(): string {
  if (typeof window === "undefined") return "WORLD";
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl =
      params.get("room")?.trim().toUpperCase() ??
      params.get("invite")?.trim().toUpperCase() ??
      null;
    if (fromUrl && isAgarWorldRoom(fromUrl)) {
      pinAgarRoom(fromUrl);
      return fromUrl;
    }
    const pinned = window.localStorage.getItem(AGAR_ACTIVE_ROOM_KEY)?.trim().toUpperCase() ?? null;
    if (pinned && isAgarWorldRoom(pinned)) return pinned;
  } catch {
    /* ignore */
  }
  return "WORLD";
}
