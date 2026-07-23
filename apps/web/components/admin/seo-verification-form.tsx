"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

import { saveSeoVerification } from "@/app/admin/seo/actions";

export function VerificationForm({
  initial,
}: {
  initial: { google: string; bing: string; naver: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await saveSeoVerification({
          google: formData.get("google") as string,
          bing: formData.get("bing") as string,
          naver: formData.get("naver") as string,
        });
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-lg space-y-4 rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        Google Search Console, Bing Webmaster, 네이버 서치어드바이저 verification token을
        입력하세요. 저장 후 사이트 &lt;head&gt;에 meta tag가 자동 주입됩니다.
      </p>
      {(
        [
          ["google", "Google Search Console", initial.google],
          ["bing", "Bing Webmaster", initial.bing],
          ["naver", "네이버 서치어드바이저", initial.naver],
        ] as const
      ).map(([name, label, defaultValue]) => (
        <div key={name}>
          <label className="mb-1 block text-sm font-medium">{label}</label>
          <input
            name={name}
            defaultValue={defaultValue}
            placeholder="verification token"
            className="w-full rounded border bg-background px-3 py-2 text-sm"
          />
        </div>
      ))}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {saved ? <p className="text-sm text-green-400">저장되었습니다.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        저장
      </button>
    </form>
  );
}
