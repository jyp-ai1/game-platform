import { Fragment } from "react";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type HeatmapCell = { dow: number; hour: number; count: number };

function cellColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "bg-muted/40";
  const t = count / max;
  if (t >= 0.75) return "bg-primary";
  if (t >= 0.5) return "bg-primary/70";
  if (t >= 0.25) return "bg-primary/40";
  return "bg-primary/20";
}

export function ActivityHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const max = Math.max(...cells.map((c) => c.count), 1);
  const grid = new Map<string, number>();
  for (const c of cells) {
    grid.set(`${c.dow}-${c.hour}`, c.count);
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-cols-[2rem_repeat(24,minmax(0.75rem,1fr))] gap-0.5 text-[10px]">
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-center text-muted-foreground">
            {h}
          </div>
        ))}
        {DOW.map((label, dow) => (
          <Fragment key={dow}>
            <div className="pr-1 text-right text-muted-foreground">{label}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const count = grid.get(`${dow}-${hour}`) ?? 0;
              return (
                <div
                  key={`${dow}-${hour}`}
                  title={`${label} ${hour}h: ${count}`}
                  className={`aspect-square rounded-sm ${cellColor(count, max)}`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
