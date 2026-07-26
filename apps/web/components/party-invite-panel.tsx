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

/** Universal Invite — Kakao, SMS, Discord, Web Share, Deep Link. */
export function PartyInvitePanel({
  code,
  gameSlug = "snake",
}: {
  code: string;
  gameSlug?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = getPartyLinkUrl(code);
  const deepLink = `${url}?join=1`;

  async function handleCopy() {
    await navigator.clipboard.writeText(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button size="sm" variant="outline" className="gap-1" onClick={() => shareRoom(code, gameSlug)}>
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
  );
}
