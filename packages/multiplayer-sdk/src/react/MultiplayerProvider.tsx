"use client";

import type { GameRoom } from "@game-platform/shared";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getRoom, subscribeRoom } from "../client/room-client";

interface MultiplayerContextValue {
  room: GameRoom | null;
  code: string | null;
}

const MultiplayerContext = createContext<MultiplayerContextValue>({ room: null, code: null });

export function MultiplayerProvider({
  code,
  children,
}: {
  code: string;
  children: ReactNode;
}) {
  const [room, setRoom] = useState<GameRoom | null>(() => getRoom(code));

  useEffect(() => {
    setRoom(getRoom(code));
    const unsub = subscribeRoom(code, setRoom);
    const poll = setInterval(() => setRoom(getRoom(code)), 800);
    return () => {
      unsub();
      clearInterval(poll);
    };
  }, [code]);

  return (
    <MultiplayerContext.Provider value={{ room, code }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayerRoom(): MultiplayerContextValue {
  return useContext(MultiplayerContext);
}
