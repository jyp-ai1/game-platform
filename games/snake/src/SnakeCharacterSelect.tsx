"use client";

import {
  MP_PLAYER_COLORS,
  MultiplayerEntrySelect,
} from "@game-platform/game-sdk";

import {
  SNAKE_HEAD_CHARACTERS,
  SNAKE_HEAD_IDS,
  type SnakeHeadId,
} from "./snake-characters";

const SNAKE_STYLES = SNAKE_HEAD_IDS.map((id) => ({
  id,
  label: SNAKE_HEAD_CHARACTERS[id].label,
  emoji: SNAKE_HEAD_CHARACTERS[id].emoji,
  color: SNAKE_HEAD_CHARACTERS[id].bodyColor,
}));

export function SnakeCharacterSelect({
  value,
  onChange,
  color,
  onColorChange,
  onConfirm,
  players,
  bots,
  roomCode,
}: {
  value: SnakeHeadId;
  onChange: (id: SnakeHeadId) => void;
  color: string;
  onColorChange: (color: string) => void;
  onConfirm: () => void;
  players?: number;
  bots?: number;
  roomCode?: string;
}) {
  return (
    <MultiplayerEntrySelect
      title="Snake"
      subtitle="캐릭터 선택 후 ENTER"
      styles={SNAKE_STYLES}
      styleId={value}
      onStyleChange={(id) => onChange(id as SnakeHeadId)}
      colors={MP_PLAYER_COLORS}
      color={color}
      onColorChange={onColorChange}
      onPlay={onConfirm}
      playLabel="ENTER"
      players={players}
      bots={bots}
      roomCode={roomCode}
    />
  );
}
