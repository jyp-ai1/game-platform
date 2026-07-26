import { buildDailyOpsBrief } from "@/lib/ai-daily-ops";

/** AI-generated daily ops brief — 5-minute admin routine. */
export function AdminDailySummary() {
  const brief = buildDailyOpsBrief();
  const date = new Date(brief.generatedAt).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <BriefCard title="Today's Wins" subtitle={date} items={brief.wins} accent="emerald" />
      <BriefCard title="Today's Risks" subtitle="주의" items={brief.risks} accent="amber" />
      <BriefCard title="Today's Opportunities" subtitle="다음 P0" items={brief.opportunities} accent="violet" />
    </section>
  );
}

function BriefCard({
  title,
  subtitle,
  items,
  accent,
}: {
  title: string;
  subtitle: string;
  items: string[];
  accent: "emerald" | "amber" | "violet";
}) {
  const border =
    accent === "emerald"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : accent === "amber"
        ? "border-amber-500/25 bg-amber-500/5"
        : "border-violet-500/25 bg-violet-500/5";

  return (
    <div className={`rounded-2xl border p-5 ${border}`}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</p>
      <h2 className="mt-1 font-semibold">{title}</h2>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground">· {item}</li>
        ))}
      </ul>
    </div>
  );
}
