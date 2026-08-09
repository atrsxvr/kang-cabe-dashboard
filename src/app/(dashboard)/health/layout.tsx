import { Suspense } from "react";

import { HealthTabs } from "@/components/health/health-tabs";

/**
 * The tabs live here rather than in each page so they survive navigation
 * between them — switching tabs should swap the content underneath, not blank
 * the whole section and redraw its own navigation.
 *
 * It also keeps them out of every loading skeleton below.
 */
export default function HealthLayout({ children }: LayoutProps<"/health">) {
  return (
    <>
      {/* useSearchParams opts a route out of prerendering unless it sits behind
          a boundary; the fallback is the same size so nothing shifts. */}
      <Suspense fallback={<div className="mb-6 h-9" />}>
        <HealthTabs />
      </Suspense>
      {children}
    </>
  );
}
