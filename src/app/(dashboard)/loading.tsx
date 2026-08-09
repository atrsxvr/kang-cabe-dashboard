import {
  CardsSkeleton,
  HeaderSkeleton,
  Loading,
} from "@/components/common/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * This file serves `/` as well as any nested route without its own loader, so
 * it mirrors the Dashboard. The placeholder modules carry their own.
 */
export default function DashboardLoading() {
  return (
    <Loading>
      <HeaderSkeleton action={false} />
      <Skeleton className="mb-6 h-5 w-20 rounded-full" />
      <CardsSkeleton count={4} />
      <Skeleton className="mt-6 h-40 rounded-xl" />
    </Loading>
  );
}
