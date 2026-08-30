/**
 * Invite URL helpers — same room join path for Host/Guest.
 */
import { BASE, invitePath } from "./lib/mp-common.mjs";

export { invitePath, BASE, COMMIT, OUT } from "./lib/mp-common.mjs";

export function bomberInviteUrl(room = "BOMBER-B", extra = "") {
  return `${BASE}${invitePath("bomber", room, extra)}`;
}

export function gameInviteUrl(slug, room, extra = "") {
  return `${BASE}${invitePath(slug, room, extra)}`;
}
