import {
  CardsSkeleton,
  HeaderSkeleton,
  Loading,
} from "@/components/common/page-skeleton";

export default function FinanceLoading() {
  return (
    <Loading>
      <HeaderSkeleton action={false} />
      <div className="mt-6">
        <CardsSkeleton count={1} className="grid gap-4" height="h-32" />
      </div>
      <div className="mt-6">
        <CardsSkeleton
          count={2}
          className="grid gap-6 lg:grid-cols-2"
          height="h-56"
        />
      </div>
    </Loading>
  );
}
