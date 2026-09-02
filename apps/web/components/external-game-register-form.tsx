"use client";

import { Button } from "@game-platform/ui";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { slugifyTitle } from "@/lib/creator/register-external-game";

type FieldErrors = Partial<Record<"title" | "slug" | "description" | "playUrl" | "authorName", string>>;

/**
 * MP-CTO-022 — minimal external game registration (Supabase-backed).
 */
export function ExternalGameRegisterForm() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [playUrl, setPlayUrl] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const suggestedSlug = useMemo(() => (title.trim() ? slugifyTitle(title) : ""), [title]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(value.trim() ? slugifyTitle(value) : "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/creator/register-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || suggestedSlug,
          description,
          playUrl,
          authorName: authorName || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        field?: keyof FieldErrors;
        game?: { slug: string };
      };

      if (!data.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error ?? "입력 오류" });
        } else {
          setFormError(data.error ?? "등록 실패");
        }
        return;
      }

      setPublishedSlug(data.game?.slug ?? slug);
    } catch {
      setFormError("네트워크 오류 — 다시 시도하세요.");
    } finally {
      setBusy(false);
    }
  }

  if (publishedSlug) {
    return (
      <div
        className="mx-auto max-w-lg rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
        data-testid="game-register-success"
      >
        <Check className="mx-auto size-12 text-emerald-400" />
        <h2 className="mt-4 text-2xl font-bold">등록 완료</h2>
        <p className="mt-2 text-muted-foreground">게임이 플랫폼 카탈로그에 저장되었습니다.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button nativeButton={false} render={<Link href={`/games/${publishedSlug}`}>상세 보기</Link>} />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/games/${publishedSlug}/play`}>플레이</Link>}
          />
          <Button variant="outline" nativeButton={false} render={<Link href="/games">목록</Link>} />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-xl space-y-6"
      data-testid="game-register-form"
    >
      <div>
        <h1 className="text-2xl font-bold">게임 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          외부 게임 URL을 등록하면 다른 사용자도 목록에서 플레이할 수 있습니다.
        </p>
      </div>

      {formError ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {formError}
        </p>
      ) : null}

      <Field label="게임 제목 *" error={fieldErrors.title}>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
          minLength={2}
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm"
          data-testid="register-title"
        />
      </Field>

      <Field label="slug *" error={fieldErrors.slug} hint="영문 소문자 · 숫자 · 하이픈">
        <input
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm font-mono"
          data-testid="register-slug"
        />
      </Field>

      <Field label="게임 URL *" error={fieldErrors.playUrl} hint="https:// 로 시작하는 플레이 가능한 주소">
        <input
          type="url"
          value={playUrl}
          onChange={(e) => setPlayUrl(e.target.value)}
          required
          placeholder="https://example.com/my-game/"
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm"
          data-testid="register-play-url"
        />
      </Field>

      <Field label="설명 *" error={fieldErrors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm"
          data-testid="register-description"
        />
      </Field>

      <Field label="작성자" error={fieldErrors.authorName}>
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Player"
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm"
          data-testid="register-author"
        />
      </Field>

      <Button type="submit" disabled={busy} className="w-full gap-2" data-testid="register-submit">
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        등록하기
      </Button>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      {children}
      {error ? <span className="block text-xs text-red-400">{error}</span> : null}
    </label>
  );
}
