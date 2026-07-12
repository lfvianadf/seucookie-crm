export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-berinjela-100/70 ${className}`}
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/5" />
      </div>
      <Skeleton className="h-5 w-20 rounded-md" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <Skeleton className="mb-3 aspect-square w-full rounded-md" />
      <Skeleton className="mb-2 h-3.5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
