/**
 * Same-world invite probe — Host A + Guest B share invite URL room param.
 * Used by bomber-dual-context; stub for future Snake/Agar same-world gates.
 */
export { invitePath, newContextWithDevice, enterGame } from "./lib/mp-common.mjs";

export function sameWorldRoom(slug, letter = "B") {
  if (slug === "bomber") return `BOMBER-${letter}`;
  return `WORLD-QA010`;
}
