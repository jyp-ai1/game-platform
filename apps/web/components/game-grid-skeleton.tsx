export function GameGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse flex-col overflow-hidden rounded-xl border"
        >
          <div className="aspect-video bg-muted" />
          <div className="flex flex-col gap-2 p-4">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="mt-2 h-9 w-full rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
