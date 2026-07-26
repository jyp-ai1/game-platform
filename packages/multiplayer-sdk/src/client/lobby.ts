import type { GameRoom } from "@game-platform/shared";

/** Party link URL — replay.gg/p/{code} */
export function getPartyLinkUrl(code: string): string {
  if (typeof window === "undefined") return `/p/${code}`;
  return `${window.location.origin}/p/${code}`;
}

/** Legacy room URL — redirects to party link. */
export function getInviteUrl(code: string): string {
  return getPartyLinkUrl(code);
}

export function getShareText(code: string, gameSlug: string, playerCount?: number, maxPlayers?: number): string {
  const count = playerCount != null && maxPlayers != null ? `${playerCount} / ${maxPlayers}` : code;
  return `Re:Play ${gameSlug.replace(/-/g, " ")} · ${count}\n${getPartyLinkUrl(code)}`;
}

export function getKakaoShareUrl(code: string, gameSlug: string, room?: GameRoom): string {
  const text = encodeURIComponent(getShareText(code, gameSlug, room?.players.length, room?.maxPlayers));
  return `https://story.kakao.com/share?url=${encodeURIComponent(getPartyLinkUrl(code))}&text=${text}`;
}

export function getDiscordShareUrl(code: string, gameSlug: string, room?: GameRoom): string {
  const text = encodeURIComponent(getShareText(code, gameSlug, room?.players.length, room?.maxPlayers));
  return `https://discord.com/channels/@me?text=${text}`;
}

export function getSmsShareUrl(code: string, gameSlug: string, room?: GameRoom): string {
  const body = encodeURIComponent(getShareText(code, gameSlug, room?.players.length, room?.maxPlayers));
  return `sms:?body=${body}`;
}

/** Web Share API or clipboard fallback. */
export async function shareRoom(code: string, gameSlug: string, room?: GameRoom): Promise<boolean> {
  const url = getPartyLinkUrl(code);
  const text = getShareText(code, gameSlug, room?.players.length, room?.maxPlayers);
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: `Re:Play Room ${code}`, url, text });
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

/** QR code data URL target (consumer renders QR from URL). */
export function getQrTargetUrl(code: string): string {
  return getPartyLinkUrl(code);
}
