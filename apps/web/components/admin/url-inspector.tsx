"use client";

import { useState, useTransition } from "react";

import { inspectSeoUrl } from "@/app/admin/seo/actions";

export function UrlInspector() {
  const [path, setPath] = useState("/games/2048");
  const [result, setResult] = useState<Awaited<ReturnType<typeof inspectSeoUrl>> | null>(null);
  const [pending, startTransition] = useTransition();

  function runInspect() {
    startTransition(async () => {
      const data = await inspectSeoUrl(path);
      setResult(data);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/games/2048"
          className="min-w-[240px] flex-1 rounded border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={runInspect}
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          검사
        </button>
      </div>

      {result ? (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p>
            <span className="font-medium">Found:</span> {result.found ? "Yes" : "No"}
          </p>
          {"indexable" in result ? (
            <p>
              <span className="font-medium">Indexable:</span>{" "}
              {result.indexable ? "Submitted / eligible" : "Not indexed"}
            </p>
          ) : null}
          {"title" in result && result.title ? (
            <p>
              <span className="font-medium">Title:</span> {result.title}
            </p>
          ) : null}
          {"status" in result && result.status ? (
            <p>
              <span className="font-medium">Status:</span> {result.status}
            </p>
          ) : null}
          {result.issues?.length ? (
            <ul className="mt-3 list-disc pl-5 text-amber-400">
              {result.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-green-400">Issues 없음</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
