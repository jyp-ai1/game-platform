"use client";

import { useState } from "react";

export function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Login failed");
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-24 max-w-sm space-y-4 rounded-xl border bg-card p-6"
    >
      <h1 className="text-xl font-semibold">Admin Login</h1>
      <p className="text-sm text-muted-foreground">
        Re:Play 운영 대시보드 — ADMIN_SECRET 필요
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        autoComplete="current-password"
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
