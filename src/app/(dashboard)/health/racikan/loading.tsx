import {
  CardsSkeleton,
  HeaderSkeleton,
  Loading,
} from "@/components/common/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecipeLibraryLoading() {
  return (
    <Loading>
      <HeaderSkeleton />

      {/* Filter chips and the search box. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-7 w-20 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-8 min-w-48 flex-1 rounded-lg" />
      </div>

      {/* Recipe cards arrive collapsed, so the placeholders are short too. */}
      <CardsSkeleton count={3} className="grid gap-3" height="h-24" />

      {/* The registered-materials strip closes the page; leaving it out made
          the skeleton end far above where the content does. */}
      <div className="mt-10">
        <Skeleton className="h-5 w-36" />
        {/* Literal classes: Tailwind cannot generate a width it never sees
            written out. */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-7 w-36 rounded-md" />
        </div>
      </div>
    </Loading>
  );
}
