"use client";

import {
  getDiscordShareUrl,
  getKakaoShareUrl,
  getPartyLinkUrl,
  getQrTargetUrl,
  getSmsShareUrl,
  shareRoom,
} from "@game-platform/multiplayer-sdk";
import { Button } from "@game-platform/ui";
import { Copy, MessageCircle, Share2, Smartphone } from "lucide-react";
import { useState } from "react";

function buildInviteText(
  code: string,
  gameSlug: string,
  reason?: string,
  playerCount?: number,
  maxPlayers?: number,
): string {
  const url = getPartyLinkUrl(code);
  const count = playerCount != null && maxPlayers != null ? `${playerCount}/${maxPlayers}` : code;
  const hook = reason ?? `Re:Play ${gameSlug.replace(/-/g, " ")} · ${count}`;
  return `${hook}\n${url}?join=1`;
}

/** Universal Invite — reason-first ("Lv10 찍자"), not "친구야 와". */
export function PartyInvitePanel({
  code,
  gameSlug = "snake",
  inviteReason,
  playerCount,
  maxPlayers,
}: {
  code: string;
  gameSlug?: string;
  inviteReason?: string;
  playerCount?: number;
  maxPlayers?: number;
}) {
  const [copied, setCopied] = useState(false);
  const url = getPartyLinkUrl(code);
  const deepLink = `${url}?join=1`;
  const reasonText = inviteReason ?? `같이 Replay 하자`;

  async function handleCopy() {
    await navigator.clipboard.writeText(buildInviteText(code, gameSlug, reasonText, playerCount, maxPlayers));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    const text = buildInviteText(code, gameSlug, reasonText, playerCount, maxPlayers);
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: reasonText, url: deepLink, text });
      return;
    }
    await shareRoom(code, gameSlug);
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-center text-sm font-medium text-emerald-300">{reasonText}</p>
      <div className="flex flex-wrap justify-center gap-2">
      <Button size="sm" variant="outline" className="gap-1" onClick={handleShare}>
        <Share2 className="size-3" /> Share
      </Button>
      <Button size="sm" variant="outline" className="gap-1" onClick={handleCopy}>
        <Copy className="size-3" /> {copied ? "Copied!" : "Copy"}
      </Button>
      <Button size="sm" variant="outline" nativeButton={false} render={
        <a href={getKakaoShareUrl(code, gameSlug)} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="size-3 inline mr-1" />Kakao
        </a>
      } />
      <Button size="sm" variant="outline" nativeButton={false} render={
        <a href={getSmsShareUrl(code, gameSlug)}><Smartphone className="size-3 inline mr-1" />SMS</a>
      } />
      <Button size="sm" variant="outline" nativeButton={false} render={
        <a href={getDiscordShareUrl(code, gameSlug)} target="_blank" rel="noopener noreferrer">Discord</a>
      } />
      <span className="w-full truncate text-center text-[9px] text-muted-foreground" title={getQrTargetUrl(code)}>
        Deep Link: {deepLink}
      </span>
      </div>
    </div>
  );
}
