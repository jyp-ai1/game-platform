"use client";

import { Button } from "@game-platform/ui";
import { Copy, MessageCircle, QrCode, Share2 } from "lucide-react";
import { useState } from "react";

import { trackInviteMetric, trackShareMetric } from "@/components/product-metrics-bridge";
import { getInviteUrl } from "@/lib/multiplayer-rooms";

export function SocialInvitePanel({ gameSlug, title }: { gameSlug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const code = `REPLAY-${gameSlug.slice(0, 4).toUpperCase()}`;
  const gameUrl = typeof window !== "undefined" ? `${window.location.origin}/games/${gameSlug}` : "";

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
    trackShareMetric();
  }

  function smsShare() {
    const url = `${window.location.origin}/games/${gameSlug}`;
    window.location.href = `sms:?body=${encodeURIComponent(`Re:Play Challenge · ${title}\n${url}`)}`;
    trackInviteMetric();
  }

  function kakaoShare() {
    const url = `${window.location.origin}/games/${gameSlug}`;
    window.open(
      `https://story.kakao.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      "_blank"
    );
  }

  function discordShare() {
    const text = encodeURIComponent(`Re:Play · Beat my score in ${title}!\n${gameUrl}`);
    window.open(`https://discord.com/channels/@me?text=${text}`, "_blank");
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
        <Button size="sm" variant="outline" onClick={discordShare}>
          Discord
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={copyCode}>
          <Copy className="size-3" /> {copied ? "Copied" : "Code"}
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowQr((v) => !v)}>
          <QrCode className="size-3" /> QR
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => window.open(getInviteUrl(code), "_blank")}
        >
          Room
        </Button>
      </div>
      {showQr && gameUrl ? (
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(gameUrl)}`}
          alt="Game invite QR"
          width={160}
          height={160}
          className="mt-3 rounded-xl border border-white/10"
        />
      ) : null}
    </section>
  );
}
