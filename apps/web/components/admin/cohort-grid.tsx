export type CohortRow = {
  cohort_date: string;
  cohort_size: number;
  d1_pct: number;
  d7_pct: number;
  d30_pct: number;
};

function cellColor(pct: number): string {
  if (pct >= 40) return "bg-primary";
  if (pct >= 20) return "bg-primary/70";
  if (pct >= 10) return "bg-primary/40";
  if (pct > 0) return "bg-primary/20";
  return "bg-muted";
}

export function CohortGrid({ rows }: { rows: CohortRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">players 테이블 데이터 필요 (0011)</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-2 pr-3">Cohort</th>
            <th className="py-2 pr-3">Size</th>
            <th className="py-2 pr-3">D1</th>
            <th className="py-2 pr-3">D7</th>
            <th className="py-2">D30</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohort_date} className="border-t border-border/50">
              <td className="py-2 pr-3 tabular-nums">{row.cohort_date}</td>
              <td className="py-2 pr-3 tabular-nums">{row.cohort_size}</td>
              <td className="py-2 pr-3">
                <span
                  className={`inline-block min-w-[2.5rem] rounded px-1.5 py-0.5 text-center tabular-nums ${cellColor(row.d1_pct)}`}
                >
                  {row.d1_pct}%
                </span>
              </td>
              <td className="py-2 pr-3">
                <span
                  className={`inline-block min-w-[2.5rem] rounded px-1.5 py-0.5 text-center tabular-nums ${cellColor(row.d7_pct)}`}
                >
                  {row.d7_pct}%
                </span>
              </td>
              <td className="py-2">
                <span
                  className={`inline-block min-w-[2.5rem] rounded px-1.5 py-0.5 text-center tabular-nums ${cellColor(row.d30_pct)}`}
                >
                  {row.d30_pct}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
