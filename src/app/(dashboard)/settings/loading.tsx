import {
  CardsSkeleton,
  HeaderSkeleton,
  Loading,
} from "@/components/common/page-skeleton";

export default function SettingsLoading() {
  return (
    <Loading>
      <HeaderSkeleton />
      <div className="mt-6">
        <CardsSkeleton count={4} className="grid gap-3" height="h-20" />
      </div>
    </Loading>
  );
}
