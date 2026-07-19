export function NostalgiaNote({ note }: { note: string }) {
  return (
    <div className="max-w-xl rounded-r-lg border-l-4 border-brand-amber bg-card/50 p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-amber">
        추억 이야기
      </p>
      <p className="text-sm italic text-muted-foreground">{note}</p>
    </div>
  );
}
