"use client";

import { Button } from "@game-platform/ui";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { runAIPipeline, type QACheckResult } from "@/lib/creator/ai-qa-pipeline";
import { addCreatorGame, saveSubmission } from "@/lib/creator/creator-store";
import { cloneTemplate, getTemplate } from "@/lib/creator/template-marketplace";

const STEPS = ["Upload", "Thumbnail", "Screenshots", "Tags", "Description", "AI QA", "Publish"];

export function CreatorUploadWizard() {
  const params = useSearchParams();
  const templateId = params.get("template") ?? "blank";
  const template = getTemplate(templateId);
  const cloned = cloneTemplate(templateId);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(cloned.title);
  const [slug, setSlug] = useState(cloned.slug);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState(template?.tags.join(", ") ?? "");
  const [qaRunning, setQaRunning] = useState(false);
  const [qaChecks, setQaChecks] = useState<QACheckResult[]>([]);
  const [qaPassed, setQaPassed] = useState<boolean | null>(null);
  const [published, setPublished] = useState(false);

  async function runQA() {
    setStep(5);
    setQaRunning(true);
    setQaChecks([]);
    const result = await runAIPipeline(slug);
    setQaChecks(result.checks);
    setQaPassed(result.passed);
    setQaRunning(false);
    saveSubmission({
      title,
      slug,
      description,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      thumbnailUrl: null,
      screenshots: [],
      status: result.passed ? "review" : "qa",
      qaScore: result.score,
      qaIssues: result.issues.length,
    });
  }

  function handlePublish() {
    addCreatorGame({
      slug,
      title,
      thumbnailUrl: null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      plays: 0,
      likes: 0,
      status: "published",
      templateId,
    });
    setPublished(true);
    setStep(6);
  }

  if (published) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <Check className="mx-auto size-12 text-emerald-400" />
        <h2 className="mt-4 text-2xl font-bold">Published!</h2>
        <p className="mt-2 text-muted-foreground">{title} is now live on Re:Play.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button nativeButton={false} render={<Link href={`/games/${slug}`}>Play</Link>} />
          <Button variant="outline" nativeButton={false} render={<Link href="/studio">Studio</Link>} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Upload Game</h1>
        <p className="text-sm text-muted-foreground">Template: {template?.name ?? "Blank"}</p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-full px-3 py-1 text-xs ${i <= step ? "bg-violet-500/20 text-violet-300" : "bg-muted text-muted-foreground"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <StepPanel title="Step 1 — Game Upload (zip)">
          <input type="file" accept=".zip,.json" className="w-full rounded-xl border bg-background px-4 py-8 text-sm" />
          <p className="text-xs text-muted-foreground">Replay SDK가 포함된 게임 번들을 업로드하세요.</p>
          <NextButton onClick={() => setStep(1)} />
        </StepPanel>
      ) : null}

      {step === 1 ? (
        <StepPanel title="Step 2 — Thumbnail">
          <input type="file" accept="image/*" className="w-full rounded-xl border bg-background px-4 py-6 text-sm" />
          <NextButton onClick={() => setStep(2)} />
        </StepPanel>
      ) : null}

      {step === 2 ? (
        <StepPanel title="Step 3 — Screenshots">
          <input type="file" accept="image/*" multiple className="w-full rounded-xl border bg-background px-4 py-6 text-sm" />
          <NextButton onClick={() => setStep(3)} />
        </StepPanel>
      ) : null}

      {step === 3 ? (
        <StepPanel title="Step 4 — Tags">
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="arcade, puzzle, casual" className="w-full rounded-xl border bg-background px-4 py-3 text-sm" />
          <NextButton onClick={() => setStep(4)} />
        </StepPanel>
      ) : null}

      {step === 4 ? (
        <StepPanel title="Step 5 — Description">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Game title" className="mb-3 w-full rounded-xl border bg-background px-4 py-3 text-sm" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="mb-3 w-full rounded-xl border bg-background px-4 py-3 text-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={4} className="w-full rounded-xl border bg-background px-4 py-3 text-sm" />
          <Button onClick={runQA} className="mt-4 gap-2">Run AI QA <ChevronRight className="size-4" /></Button>
        </StepPanel>
      ) : null}

      {step >= 5 ? (
        <StepPanel title="Step 6 — AI QA">
          {qaRunning ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Running automated checks…
            </div>
          ) : (
            <ul className="space-y-2">
              {qaChecks.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                  <span>{c.label}</span>
                  <span className={c.status === "pass" ? "text-emerald-400" : c.status === "warn" ? "text-amber-400" : "text-red-400"}>
                    {c.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {qaPassed === true ? (
            <Button onClick={handlePublish} className="mt-4">Publish →</Button>
          ) : qaPassed === false ? (
            <p className="mt-4 text-sm text-amber-400">2 issues found — fix and re-run QA, or publish with warnings.</p>
          ) : null}
          {qaPassed === false && !qaRunning ? (
            <Button variant="outline" onClick={handlePublish} className="mt-2">Publish anyway</Button>
          ) : null}
        </StepPanel>
      ) : null}
    </div>
  );
}

function StepPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-card/40 p-6">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function NextButton({ onClick }: { onClick: () => void }) {
  return <Button onClick={onClick} className="mt-4 gap-2">Next <ChevronRight className="size-4" /></Button>;
}
