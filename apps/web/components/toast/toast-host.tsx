"use client";

import {
  subscribeEngagementEvents,
  type EngagementEvent,
} from "@game-platform/game-sdk";
import { useEffect, useState } from "react";

import { ToastItem } from "./toast-item";

interface ToastEntry {
  id: number;
  event: EngagementEvent;
}

let nextId = 0;

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  useEffect(() => {
    return subscribeEngagementEvents((event) => {
      // Not a bare mount-effect setState: this runs inside the subscribed
      // callback, only when an event actually fires.
      setToasts((prev) => [...prev, { id: nextId++, event }]);
    });
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          event={toast.event}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  );
}
