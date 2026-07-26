"use client";

import { Button } from "@game-platform/ui";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { addCreatorGame } from "@/lib/creator/creator-store";
import { GAME_TEMPLATES } from "@/lib/creator/template-marketplace";

/** No-Code Studio — Template → customize → Publish without code. */
export function NocodeStudioWizard() {
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState("snake");
  const [title, setTitle] = useState("My Snake Game");
  const [speed, setSpeed] = useState(5);
  const [mapStyle, setMapStyle] = useState("classic");
  const [published, setPublished] = useState(false);

  const template = GAME_TEMPLATES.find((t) => t.id === templateId);

  function handlePublish() {
    const slug = `nc-${templateId}-${Date.now().toString(36).slice(-4)}`;
    addCreatorGame({
      slug,
      title,
      thumbnailUrl: null,
      tags: [templateId, mapStyle, "nocode"],
      plays: 0,
      likes: 0,
      status: "published",
      templateId,
    });
    setPublished(true);
  }

  if (published) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <h2 className="text-2xl font-bold">🎉 Published!</h2>
        <p className="mt-2 text-muted-foreground">{title} is live — no code required.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button nativeButton={false} render={<Link href="/creators">Creators Hub</Link>} />
          <Button variant="outline" nativeButton={false} render={<Link href="/studio/upload">Advanced Mode →</Link>} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Create Game — No Code</h1>
        <p className="text-sm text-muted-foreground">Template 선택 → 커스터마이즈 → Publish. 코드 없이 게임 제작.</p>
      </div>

      {step === 0 ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-card/40 p-6">
          <h2 className="font-semibold">1. Template 선택</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {GAME_TEMPLATES.filter((t) => t.id !== "blank").map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTemplateId(t.id); setTitle(`My ${t.name}`); }}
                className={`rounded-xl border p-4 text-left text-sm ${templateId === t.id ? "border-violet-500 bg-violet-500/10" : "border-white/10"}`}
              >
                <p className="font-medium">{t.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.estimatedTime}</p>
              </button>
            ))}
          </div>
          <Button onClick={() => setStep(1)} className="gap-2">Next <ChevronRight className="size-4" /></Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-card/40 p-6">
          <h2 className="font-semibold">2. 커스터마이즈 — {template?.name}</h2>
          <label className="block text-sm">
            <span className="text-muted-foreground">게임 이름</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-4 py-3 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">맵 스타일</span>
            <select value={mapStyle} onChange={(e) => setMapStyle(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-4 py-3 text-sm">
              <option value="classic">Classic</option>
              <option value="neon">Neon</option>
              <option value="pixel">Pixel</option>
              <option value="space">Space</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">속도: {speed}</span>
            <input type="range" min={1} max={10} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-2 w-full" />
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)} className="gap-2">Preview & Publish <ChevronRight className="size-4" /></Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-card/40 p-6">
          <h2 className="font-semibold">3. Publish</h2>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">Template: {template?.name} · Map: {mapStyle} · Speed: {speed}</p>
          </div>
          <Button onClick={handlePublish} className="w-full">Publish Game</Button>
          <p className="text-center text-xs text-muted-foreground">
            Need code? <Link href="/studio/upload" className="text-primary hover:underline">Advanced Mode</Link> — Github · HTML5 · React · Phaser · Godot · Unity WebGL
          </p>
        </section>
      ) : null}
    </div>
  );
}
