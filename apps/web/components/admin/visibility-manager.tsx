"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setGameVisibility } from "@/app/admin/cms/actions";

type Row = {
  game_slug: string;
  visibility: string;
  note: string | null;
  games: { title: string; status: string } | null;
};

const OPTIONS = [
  { value: "visible", label: "노출" },
  { value: "hidden", label: "숨김" },
  { value: "coming_soon", label: "Coming Soon" },
  { value: "maintenance", label: "Maintenance" },
];

export function VisibilityManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(slug: string, visibility: string) {
    startTransition(async () => {
      await setGameVisibility(slug, visibility);
      router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="p-3">게임</th>
            <th className="p-3">DB status</th>
            <th className="p-3">노출 설정</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.game_slug} className="border-b border-border/50">
              <td className="p-3 font-medium">{row.games?.title ?? row.game_slug}</td>
              <td className="p-3 text-muted-foreground">{row.games?.status}</td>
              <td className="p-3">
                <select
                  value={row.visibility}
                  disabled={pending}
                  onChange={(e) => onChange(row.game_slug, e.target.value)}
                  className="rounded border bg-background px-2 py-1"
                >
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
