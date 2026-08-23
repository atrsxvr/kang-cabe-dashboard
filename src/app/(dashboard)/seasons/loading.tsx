import {
  HeaderSkeleton,
  Loading,
  TableSkeleton,
} from "@/components/common/page-skeleton";

export default function SeasonsLoading() {
  return (
    <Loading>
      <HeaderSkeleton />
      <TableSkeleton rows={3} />
    </Loading>
  );
}
