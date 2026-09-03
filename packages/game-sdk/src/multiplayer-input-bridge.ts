/** Shared keyboard passthrough for multiplayer play — prevents browser scroll stealing game keys. */

const MP_GAME_KEY_CODES = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
]);

export function isMpGameKey(code: string): boolean {
  return MP_GAME_KEY_CODES.has(code);
}

/** True only after the player explicitly activated the board (click/tap), not on page load. */
export function isMpBoardInputActive(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.querySelector('[data-mp-play-board][data-mp-board-input="active"]') != null
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/**
 * Capture-phase listener: preventDefault on game keys so arrows/space/W don't scroll the page.
 * Games keep their own bubble-phase window listeners — this only unblocks delivery.
 */
export function installMpKeyboardPassthrough(active: () => boolean): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (!active()) return;
    if (e.code === "Escape") return;
    if (!isMpGameKey(e.code)) return;
    if (isTypingTarget(e.target)) return;
    if (!isMpBoardInputActive()) return;
    e.preventDefault();
  };
  window.addEventListener("keydown", onKeyDown, { capture: true });
  return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
}
