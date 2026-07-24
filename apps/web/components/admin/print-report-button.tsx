"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border bg-card p-4 text-left hover:bg-muted/50"
    >
      <p className="font-medium">Print / PDF</p>
      <p className="mt-1 text-sm text-muted-foreground">
        인쇄 대화상자에서 PDF로 저장
      </p>
    </button>
  );
}
