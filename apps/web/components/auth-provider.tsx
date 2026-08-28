"use client";

/**
 * RC-AUTH-001 — Player AuthProvider (session init + Guest↔Auth merge).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import {
  applyGuestAuthMerge,
  avatarUrlFromUser,
  displayNameFromUser,
  signInWithGoogle,
  signOutPlayer,
} from "@/lib/auth/player-auth";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  displayName: string;
  avatarUrl: string | null;
  isAuthenticated: boolean;
  signIn: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = useCallback((next: Session | null) => {
    setSession(next);
    if (next?.user) applyGuestAuthMerge(next.user);
  }, []);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      hydrateUser(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      hydrateUser(next);
      setLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrateUser]);

  const signIn = useCallback(async () => {
    const { error } = await signInWithGoogle();
    return error;
  }, []);

  const signOut = useCallback(async () => {
    await signOutPlayer();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    return {
      session,
      user,
      loading,
      displayName: displayNameFromUser(user),
      avatarUrl: avatarUrlFromUser(user),
      isAuthenticated: !!user,
      signIn,
      signOut,
    };
  }, [session, loading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function usePlayerAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("usePlayerAuth must be used within AuthProvider");
  }
  return ctx;
}
