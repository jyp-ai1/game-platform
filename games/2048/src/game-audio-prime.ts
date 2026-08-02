import {
  isSoundEnabled,
  playGameOverSound,
  playStageClearSound,
  playStartSound,
  setSoundEnabled,
} from "@game-platform/game-sdk";

let primed = false;

/** First user gesture: enable platform sound + play start tone. */
export function primeGameAudio(): void {
  if (!isSoundEnabled()) {
    setSoundEnabled(true);
  }
  if (!primed) {
    primed = true;
    playStartSound();
  }
}

export function playStageClearAudio(): void {
  primeGameAudio();
  playStageClearSound();
}

export function playGameOverAudio(): void {
  primeGameAudio();
  playGameOverSound();
}

export function resetGameAudioPrime(): void {
  primed = false;
}
