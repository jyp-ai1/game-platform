"use client";

/**
 * RC-AUTH-001 — OAuth callback (PKCE code → session).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { applyGuestAuthMerge } from "@/lib/auth/player-auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("로그인 처리 중…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const err = url.searchParams.get("error_description") ?? url.searchParams.get("error");
        if (err) {
          if (!cancelled) setMessage(`로그인 실패: ${err}`);
          return;
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (!cancelled) setMessage(`세션 교환 실패: ${error.message}`);
            return;
          }
          if (data.user) applyGuestAuthMerge(data.user);
        } else {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) applyGuestAuthMerge(data.session.user);
        }

        if (!cancelled) router.replace("/profile");
      } catch (e) {
        if (!cancelled) setMessage(e instanceof Error ? e.message : "로그인 처리 실패");
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
