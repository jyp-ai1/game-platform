"use client";

import { MP_PLAYER_COLORS, MultiplayerEntrySelect } from "@game-platform/game-sdk";

import {
  SNAKE_HEAD_CHARACTERS,
  SNAKE_HEAD_IDS,
  type SnakeHeadId,
} from "./snake-characters";

const SNAKE_ENTRY_STYLES = SNAKE_HEAD_IDS.map((id) => ({
  id,
  label: SNAKE_HEAD_CHARACTERS[id].label,
  emoji: SNAKE_HEAD_CHARACTERS[id].emoji,
}));

export function SnakeCharacterSelect({
  value,
  color,
  onChange,
  onColorChange,
  onConfirm,
}: {
  value: SnakeHeadId;
  color: string;
  onChange: (id: SnakeHeadId) => void;
  onColorChange: (color: string) => void;
  onConfirm: () => void;
}) {
  return (
    <MultiplayerEntrySelect
      title="머리 캐릭터 선택"
      subtitle="Character → Color → ENTER"
      styles={SNAKE_ENTRY_STYLES}
      styleId={value}
      onStyleChange={(id) => onChange(id as SnakeHeadId)}
      colors={MP_PLAYER_COLORS}
      color={color}
      onColorChange={onColorChange}
      onPlay={onConfirm}
      playLabel="ENTER"
      showColorStep
      entryMode="multiplayer"
    />
  );
}
