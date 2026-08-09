import { HeaderSkeleton, Loading } from "@/components/common/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <Loading>
      <HeaderSkeleton />

      {/* HST bar, then the view tabs, then the board columns. */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Skeleton className="h-12 w-44 rounded-lg" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>

      <Skeleton className="mb-4 h-9 w-72 rounded-lg" />

      <div className="grid gap-4 sm:grid-cols-3">
        {["Belum dikerjakan", "Dikerjakan", "Selesai"].map((column) => (
          <div key={column} className="grid gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ))}
      </div>
    </Loading>
  );
}
