import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A plain `<select>` styled to match shadcn's `Input` exactly, so the two line
 * up when they share a row.
 *
 * Native rather than the Radix Select used in the navbar: inside a form
 * submitted through a Server Action, a native control posts its value with no
 * client wiring, and on a phone it opens the OS picker. `appearance-none`
 * removes only the browser's drawn arrow — the picker behaviour is untouched.
 *
 * The arrow is ours because the browser's cannot be positioned: padding-right
 * moves the text but leaves the UA glyph nearly against the border, so the
 * control looked lopsided — roughly 10px of air on the left and 4px on the
 * right. Drawing it means both sides match, and it follows the text colour
 * into dark mode.
 *
 * The class list mirrors `components/ui/input.tsx`. If that file is
 * regenerated with different metrics, this needs the same update — the two
 * being visibly different heights is what this exists to prevent.
 */
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    // The wrapper carries the width so callers keep passing `w-44` and the
    // arrow stays pinned to the control rather than to the page.
    <div className={cn("relative", className)}>
      <select
        data-slot="native-select"
        className={cn(
          "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          "md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
        )}
        {...props}
      />
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  );
}
