"use client";

import { playStartSound } from "@game-platform/game-sdk";
import { Button } from "@game-platform/ui";
import Link from "next/link";

export function HeroCtaButton({ className }: { className?: string }) {
  return (
    <Button
      size="lg"
      className={className}
      nativeButton={false}
      render={
        <Link href="#collections" onClick={playStartSound}>
          게임 시작하기
        </Link>
      }
    />
  );
}
