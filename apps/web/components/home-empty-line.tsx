/** Shared empty-state line for home sections — consistent height + copy. */
export function HomeEmptyLine({
  children,
  testId,
  className,
}: {
  children: React.ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <p
      data-testid={testId}
      className={`min-h-[3.25rem] rounded-xl border border-dashed border-white/10 bg-card/30 px-4 py-3 text-sm leading-snug text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </p>
  );
}
