import {
  CardsSkeleton,
  HeaderSkeleton,
  Loading,
} from "@/components/common/page-skeleton";

export default function HealthLoading() {
  return (
    <Loading>
      <HeaderSkeleton />
      {/* Four status tiles, one row, matching the real page at every width. */}
      <CardsSkeleton
        count={4}
        className="mb-6 grid grid-cols-4 gap-2 sm:gap-3"
        height="h-16"
      />
      <CardsSkeleton
        count={3}
        className="grid gap-4"
        height="h-32"
      />
    </Loading>
  );
}
