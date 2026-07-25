"use client";

import { Button } from "@game-platform/ui";
import { Copy, MessageCircle, QrCode, Share2 } from "lucide-react";
import { useState } from "react";

import { getInviteUrl } from "@/lib/multiplayer-rooms";

export function SocialInvitePanel({ gameSlug, title }: { gameSlug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const code = `REPLAY-${gameSlug.slice(0, 4).toUpperCase()}`;

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function webShare() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/games/${gameSlug}` : "";
    const text = `Re:Play · Beat my score in ${title}!`;
    if (navigator.share) {
      await navigator.share({ title, url, text });
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  }

  function smsShare() {
    const url = `${window.location.origin}/games/${gameSlug}`;
    window.location.href = `sms:?body=${encodeURIComponent(`Re:Play Challenge · ${title}\n${url}`)}`;
  }

  function kakaoShare() {
    const url = `${window.location.origin}/games/${gameSlug}`;
    window.open(
      `https://story.kakao.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      "_blank"
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h3 className="font-semibold">Invite Friends</h3>
      <p className="mt-1 text-xs text-muted-foreground">Code: {code}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button size="sm" variant="outline" className="gap-1" onClick={webShare}>
          <Share2 className="size-3" /> Web Share
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={smsShare}>
          <MessageCircle className="size-3" /> SMS
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={kakaoShare}>
          Kakao
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={copyCode}>
          <Copy className="size-3" /> {copied ? "Copied" : "Code"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => window.open(getInviteUrl(code), "_blank")}
        >
          <QrCode className="size-3" /> Room
        </Button>
      </div>
    </section>
  );
}
