import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SeasonSelectorLoader,
  SeasonSelectorSkeleton,
} from "@/components/seasons/season-selector-loader";

/**
 * Route group: the eight modules share this shell without adding a URL segment.
 */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell
      seasonSelector={
        <Suspense fallback={<SeasonSelectorSkeleton />}>
          <SeasonSelectorLoader />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
