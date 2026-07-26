/** Party Voice / Ping / Emoji / QuickChat SDK stubs (P2). */
import { sendPartyChat, sendPartyReaction } from "./party";
import type { PartyReactionId } from "@game-platform/shared";

export async function joinPartyVoice(_partyCode: string): Promise<{ enabled: boolean; reason?: string }> {
  return { enabled: false, reason: "WebRTC voice coming soon" };
}

export async function pingParty(partyCode: string): Promise<void> {
  await sendPartyReaction(partyCode, "ping");
}

export async function emojiParty(partyCode: string, emoji: string): Promise<void> {
  await sendPartyChat(partyCode, emoji, emoji);
}

export async function quickChatParty(partyCode: string, reaction: PartyReactionId): Promise<void> {
  await sendPartyReaction(partyCode, reaction);
}

export const PartyVoiceEngine = {
  join: joinPartyVoice,
  ping: pingParty,
  emoji: emojiParty,
  quickChat: quickChatParty,
};
