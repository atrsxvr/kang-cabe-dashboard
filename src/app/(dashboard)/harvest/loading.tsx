import {
  CardsSkeleton,
  HeaderSkeleton,
  Loading,
  TableSkeleton,
} from "@/components/common/page-skeleton";

export default function HarvestLoading() {
  return (
    <Loading>
      <HeaderSkeleton />
      <div className="mt-6">
        <CardsSkeleton count={4} height="h-16" />
      </div>
      <div className="mt-6">
        <TableSkeleton rows={4} />
      </div>
    </Loading>
  );
}
