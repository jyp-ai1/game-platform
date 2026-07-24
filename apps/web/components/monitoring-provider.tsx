"use client";

import { getDeviceId } from "@game-platform/game-sdk";
import { useEffect } from "react";

import { initClientMonitoring } from "@/lib/monitoring";

/** Global JS error / performance monitoring — best-effort, never blocks UI. */
export function MonitoringProvider() {
  useEffect(() => {
    return initClientMonitoring(getDeviceId());
  }, []);

  return null;
}
