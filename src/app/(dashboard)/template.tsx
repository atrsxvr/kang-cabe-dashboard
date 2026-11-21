import { ViewTransition } from "react";

/**
 * Moving between modules: the new page rises in while the old one fades under
 * it (`.page-in` in globals.css).
 *
 * A template, not the layout: a layout stays mounted across navigations, so
 * an enter animation there would never fire. This remounts whenever the
 * module changes — Tugas to Panen — and not for a sub-page inside one module
 * or a change of season, where "same place, other content" is the truth and
 * a page sliding in would say otherwise.
 *
 * `default="none"`: `router.refresh()` is a transition too, and every save
 * and every LiveRefresh tick would otherwise animate the whole page. Browsers
 * without view transitions simply swap the page, as before.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransition enter="page-in" exit="none" default="none">
      {children}
    </ViewTransition>
  );
}
