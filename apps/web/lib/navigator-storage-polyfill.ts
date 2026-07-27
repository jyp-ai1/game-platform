/**
 * Safari / older WebKit: navigator.storage or .persisted() may be missing.
 * Patch before Supabase or any SDK touches StorageManager API.
 */
export function installNavigatorStoragePolyfill(): void {
  if (typeof navigator === "undefined") return;

  const existing = navigator.storage as StorageManager | undefined;

  const safePersisted = (): Promise<boolean> => {
    if (existing && typeof existing.persisted === "function") {
      return existing.persisted().catch(() => false);
    }
    return Promise.resolve(false);
  };

  const safePersist = (): Promise<boolean> => {
    if (existing && typeof existing.persist === "function") {
      return existing.persist().catch(() => false);
    }
    return Promise.resolve(false);
  };

  const safeEstimate = (): Promise<StorageEstimate> => {
    if (existing && typeof existing.estimate === "function") {
      return existing.estimate().catch(() => ({ usage: 0, quota: 0 }));
    }
    return Promise.resolve({ usage: 0, quota: 0 });
  };

  const needsPatch =
    !existing ||
    typeof existing.persisted !== "function" ||
    typeof existing.persist !== "function";

  if (!needsPatch) return;

  const patched = {
    ...existing,
    persisted: safePersisted,
    persist: safePersist,
    estimate: safeEstimate,
    getDirectory:
      existing?.getDirectory?.bind(existing) ??
      (() => Promise.reject(new Error("getDirectory unavailable"))),
  } satisfies StorageManager;

  try {
    Object.defineProperty(navigator, "storage", {
      value: patched,
      configurable: true,
      enumerable: true,
    });
  } catch {
    /* read-only navigator in some embed contexts */
  }
}

installNavigatorStoragePolyfill();
