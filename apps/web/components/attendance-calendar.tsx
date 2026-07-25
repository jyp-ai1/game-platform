"use client";

import { recordAttendance, getAttendanceStreak } from "@/lib/shop-store";
import { useEffect, useMemo, useState } from "react";

const ATTENDANCE_DAYS_KEY = "play29:attendance-days";

function readAttendanceDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(ATTENDANCE_DAYS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markTodayAttended(): string[] {
  if (typeof window === "undefined") return [];
  const today = new Date().toISOString().slice(0, 10);
  const days = new Set(readAttendanceDays());
  days.add(today);
  const list = [...days].sort().slice(-60);
  window.localStorage.setItem(ATTENDANCE_DAYS_KEY, JSON.stringify(list));
  return list;
}

export function AttendanceCalendar() {
  const [days, setDays] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    recordAttendance();
    setDays(markTodayAttended());
    setStreak(getAttendanceStreak());
  }, []);

  const cells = useMemo(() => {
    const attended = new Set(days);
    const result: { date: string; label: string; attended: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({
        date: key,
        label: String(d.getDate()),
        attended: attended.has(key),
      });
    }
    return result;
  }, [days]);

  return (
    <section className="rounded-2xl border border-white/10 bg-card/60 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Attendance</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{streak} day streak</p>
        </div>
        <p className="text-xs text-muted-foreground">Last 30 days</p>
      </div>
      <div className="mt-4 grid grid-cols-10 gap-1">
        {cells.map((c) => (
          <div
            key={c.date}
            title={c.date}
            className={`flex size-7 items-center justify-center rounded-md text-[10px] tabular-nums ${
              c.attended
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-muted/40 text-muted-foreground"
            }`}
          >
            {c.label}
          </div>
        ))}
      </div>
    </section>
  );
}
