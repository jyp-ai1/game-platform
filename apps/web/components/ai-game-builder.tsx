"use client";

import { Button } from "@game-platform/ui";
import { Bot, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  recommendFromIdea,
  buildGameSlug,
  type BuilderRecommendation,
} from "@/lib/creator/ai-game-builder";
import { runAIPipeline } from "@/lib/creator/ai-qa-pipeline";
import { addCreatorGame } from "@/lib/creator/creator-store";

/** GPT Builder — AI game creation flow. */
export function AiGameBuilder() {
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState("");
  const [rec, setRec] = useState<BuilderRecommendation | null>(null);
  const [mapSize, setMapSize] = useState("medium");
  const [food, setFood] = useState("apples");
  const [speed, setSpeed] = useState(5);
  const [title, setTitle] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [slug, setSlug] = useState("");

  function handleIdeaSubmit() {
    const r = recommendFromIdea(idea);
    setRec(r);
    setTitle(r.suggestedTitle);
    setMapSize(String(r.config.mapSize ?? "medium"));
    setFood(String(r.config.food ?? "apples"));
    setSpeed(Number(r.config.speed ?? 5));
    setStep(1);
  }

  async function handlePublish() {
    setPublishing(true);
    const gameSlug = buildGameSlug(title, rec?.templateId ?? "game");
    setSlug(gameSlug);
    await runAIPipeline(gameSlug);
    addCreatorGame({
      slug: gameSlug,
      title,
      thumbnailUrl: null,
      tags: [rec?.templateId ?? "ai", mapSize, food, "ai-built"],
      plays: 0,
      likes: 0,
      status: "published",
      templateId: rec?.templateId,
    });
    setPublishing(false);
    setPublished(true);
    setStep(4);
  }

  if (published) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <Sparkles className="mx-auto size-10 text-emerald-400" />
        <h2 className="mt-4 text-2xl font-bold">Published!</h2>
        <p className="mt-2 text-muted-foreground">{title} — AI QA passed → Marketplace</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button nativeButton={false} render={<Link href={`/games/${slug}`}>Preview Play</Link>} />
          <Button variant="outline" nativeButton={false} render={<Link href="/marketplace">Marketplace</Link>} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <Bot className="size-8 text-violet-400" />
        <div>
          <h1 className="text-2xl font-bold">AI Game Builder</h1>
          <p className="text-sm text-muted-foreground">아이디어 → AI 생성 → Preview → Publish</p>
        </div>
      </div>

      {step === 0 ? (
        <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
          <p className="font-medium">만들고 싶은 게임은?</p>
          <input
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="예: 지렁이 게임, 좀비 테마, 친구랑 같이"
            className="mt-3 w-full rounded-xl border bg-background px-4 py-3 text-sm"
            onKeyDown={(e) => e.key === "Enter" && idea.trim() && handleIdeaSubmit()}
          />
          <Button className="mt-4 gap-2" disabled={!idea.trim()} onClick={handleIdeaSubmit}>
            AI 추천 받기 <ChevronRight className="size-4" />
          </Button>
        </section>
      ) : null}

      {step >= 1 && rec ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-card/40 p-6">
          <p className="text-sm text-violet-400">AI 추천: {rec.templateName}</p>
          <p className="text-xs text-muted-foreground">{rec.reason}</p>

          {step === 1 ? (
            <>
              <label className="block text-sm">
                <span className="text-muted-foreground">맵 크기?</span>
                <select value={mapSize} onChange={(e) => setMapSize(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-4 py-3 text-sm">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </label>
              <Button onClick={() => setStep(2)} className="gap-2">Next <ChevronRight className="size-4" /></Button>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <label className="block text-sm">
                <span className="text-muted-foreground">먹이/테마?</span>
                <select value={food} onChange={(e) => setFood(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-4 py-3 text-sm">
                  <option value="apples">Apples</option>
                  <option value="stars">Stars</option>
                  <option value="brains">Brains (Zombie)</option>
                  <option value="coins">Coins</option>
                </select>
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} className="gap-2">Next <ChevronRight className="size-4" /></Button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <label className="block text-sm">
                <span className="text-muted-foreground">속도: {speed}</span>
                <input type="range" min={1} max={10} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-2 w-full" />
              </label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border bg-background px-4 py-3 text-sm" placeholder="Game title" />
              <div className="rounded-xl border border-white/10 bg-background/50 p-4">
                <p className="text-xs uppercase text-muted-foreground">Preview</p>
                <p className="mt-2 font-bold">{title}</p>
                <p className="text-sm text-muted-foreground">{rec.templateName} · {mapSize} · {food} · speed {speed}</p>
              </div>
              <Button onClick={handlePublish} disabled={publishing} className="w-full">
                {publishing ? "AI QA running…" : "Publish → AI QA → Marketplace"}
              </Button>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
