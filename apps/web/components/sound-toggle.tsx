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

export function SoundToggle() {
  const enabled = useSyncExternalStore(
    subscribeSoundEnabled,
    isSoundEnabled,
    getServerSoundEnabledSnapshot
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={enabled ? "효과음 끄기" : "효과음 켜기"}
      onClick={() => setSoundEnabled(!enabled)}
    >
      {enabled ? <Volume2 /> : <VolumeX />}
    </Button>
  );
}
