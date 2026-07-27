"use client";

/** Must mount before any Supabase / SDK client code on Safari. */
import "@/lib/navigator-storage-polyfill";

export function PolyfillInit() {
  return null;
}
