"use client";

/**
 * Sprint 17 Step 5 — AI Creator expose only (no real generator).
 */
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useState } from "react";

const KINDS = ["Arcade", "Puzzle", "Multiplayer", "Sports"];
const DIFFS = ["Easy", "Medium", "Hard"];

export function AiCreatorSoonPanel() {
  const [kind, setKind] = useState(KINDS[0]!);
  const [name, setName] = useState("");
  const [character, setCharacter] = useState("");
  const [rules, setRules] = useState("");
  const [diff, setDiff] = useState(DIFFS[1]!);
  const [preview, setPreview] = useState(false);

  return (
    <main className="flex flex-1 flex-col py-10">
      <Container className="max-w-xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
            AI Creator · SOON
          </p>
          <h1 className="mt-1 text-2xl font-bold">게임 만들기 (Beta stub)</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            실제 AI 생성기는 아직 없습니다. 폼만 노출 — CREATE 시 Preview placeholder.
          </p>
        </div>

        <form
          className="space-y-3 rounded-2xl border border-white/10 bg-card/60 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setPreview(true);
          }}
        >
          <label className="block text-sm">
            게임 종류
            <select
              className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            이름
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Game"
            />
          </label>
          <label className="block text-sm">
            캐릭터
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              placeholder="Hero"
            />
          </label>
          <label className="block text-sm">
            규칙
            <textarea
              className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
              rows={3}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="짧게 규칙을 적어보세요"
            />
          </label>
          <label className="block text-sm">
            난이도
            <select
              className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
            >
              {DIFFS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            CREATE
          </button>
        </form>

        {preview ? (
          <div
            data-testid="ai-creator-preview-placeholder"
            className="rounded-2xl border border-dashed border-amber-400/40 bg-amber-400/5 p-6 text-center"
          >
            <p className="text-sm font-semibold text-amber-300">Preview placeholder</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {kind} · {name || "Untitled"} · {character || "—"} · {diff}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{rules || "규칙 없음"}</p>
            <p className="mt-4 text-xs text-muted-foreground">AI game generator — SOON</p>
          </div>
        ) : null}

        <Link href="/" className="inline-block text-sm text-muted-foreground hover:text-foreground">
          ← 홈으로
        </Link>
      </Container>
    </main>
  );
}
