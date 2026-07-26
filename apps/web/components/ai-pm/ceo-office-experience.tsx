"use client";

import { buildActionFeedback, buildCeoOfficeSession } from "@/lib/company-os-engine";
import type { ActionFeedback, CeoOfficeSession } from "@/lib/company-os-types";
import {
  completeRecommendation,
  getCompanyCompleteness,
  getPendingFromYesterday,
  loadFounderMemory,
  recordRecommendation,
  touchVisit,
} from "@/lib/founder-memory";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionFeedbackPanel } from "./action-feedback";
import { CompanyStatusPanel } from "./company-status";
import { CompanyTimelinePanel } from "./company-timeline";
import { ConversationalBriefing } from "./conversational-briefing";
import { LivingInsightsPanel } from "./living-insights";
import { OneFocusPanel } from "./one-focus";

/** AI CEO Office — Company Operating System (Founder daily first screen) */
export function CeoOfficeExperience() {
  const [mounted, setMounted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [completeness, setCompleteness] = useState(68);

  useEffect(() => {
    touchVisit();
    setCompleteness(getCompanyCompleteness());
    setMounted(true);
  }, []);

  const session: CeoOfficeSession = useMemo(() => {
    if (!mounted) {
      return buildCeoOfficeSession();
    }
    const pending = getPendingFromYesterday();
    const mem = loadFounderMemory();
    const s = buildCeoOfficeSession({
      pendingYesterday: pending ? { id: pending.id, title: pending.title } : undefined,
      companyCompleteness: mem.companyCompleteness,
    });
    recordRecommendation({
      id: s.oneFocus.id,
      date: new Date().toISOString().slice(0, 10),
      title: s.oneFocus.title,
      ctaHref: s.oneFocus.ctaHref,
    });
    return s;
  }, [mounted]);

  const timeline = useMemo(() => {
    if (!mounted) return session.timeline;
    const mem = loadFounderMemory();
    const merged = [...mem.timeline, ...session.timeline];
    const seen = new Set<string>();
    return merged.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [mounted, session.timeline]);

  const handleComplete = useCallback(() => {
    const before = getCompanyCompleteness();
    completeRecommendation(session.oneFocus.id);
    setCompleteness(getCompanyCompleteness());
    setFeedback(buildActionFeedback(session.oneFocus.title, before));
    setCompleted(true);
  }, [session.oneFocus.id, session.oneFocus.title]);

  const todayDone = mounted && completed;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">AI CEO Office</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Company OS · 사업 완성도 {completeness}%
        </p>
      </header>

      {/* 1. Company Status FIRST */}
      <CompanyStatusPanel greeting={session.morningGreeting} pillars={session.pillars} />

      {/* 2. Living Company */}
      <LivingInsightsPanel insights={session.livingInsights} />

      {/* 3. Memory reminder inline in dialogue */}
      <ConversationalBriefing lines={session.dialogue} />

      {/* 4. One Focus — single action only */}
      <OneFocusPanel
        focus={session.oneFocus}
        onStart={handleComplete}
        completed={todayDone}
      />

      {/* 5. Action feedback on complete */}
      {feedback ? <ActionFeedbackPanel feedback={feedback} /> : null}

      {/* 6. Top risks (decision engine) */}
      <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
        <p className="font-medium text-amber-300">Top Risks</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {session.topRisks.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      </section>

      {/* 7. Company Timeline */}
      <CompanyTimelinePanel events={timeline} />
    </div>
  );
}
