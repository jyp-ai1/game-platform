"use client";

import {
  getServerSoundEnabledSnapshot,
  isSoundEnabled,
  setSoundEnabled,
  subscribeSoundEnabled,
} from "@game-platform/game-sdk";
import { Button } from "@game-platform/ui";
import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useMounted } from "@/lib/use-mounted";

export function SoundToggle() {
  const mounted = useMounted();
  const enabled = useSyncExternalStore(
    subscribeSoundEnabled,
    isSoundEnabled,
    getServerSoundEnabledSnapshot
  );

  const showEnabled = mounted ? enabled : false;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={showEnabled ? "효과음 끄기" : "효과음 켜기"}
      onClick={() => setSoundEnabled(!enabled)}
    >
      {showEnabled ? <Volume2 /> : <VolumeX />}
    </Button>
  );
}
