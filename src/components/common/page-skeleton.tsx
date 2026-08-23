import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared pieces for the per-route loading files.
 *
 * Each loader mirrors the page it precedes rather than showing one generic
 * shape: a placeholder of the wrong size is worse than none, because the
 * content jumps when it arrives.
 */

export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      {action ? <Skeleton className="h-8 w-36" /> : null}
    </div>
  );
}

export function CardsSkeleton({
  count,
  className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
  height = "h-28",
}: {
  count: number;
  className?: string;
  height?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={`${height} rounded-xl`} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="bg-muted/50 border-b px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Wraps a loader so screen readers announce the wait instead of silence. */
export function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy aria-label="Memuat halaman">
      {children}
    </div>
  );
}

/** The four modules still showing "Segera hadir" share one shape. */
export function ComingSoonLoading() {
  return (
    <Loading>
      <HeaderSkeleton action={false} />
      <Skeleton className="h-44 rounded-xl" />
    </Loading>
  );
}
