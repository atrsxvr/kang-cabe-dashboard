import { cn } from "@/lib/utils";

/**
 * A plain `<select>` styled to match shadcn's `Input` exactly, so the two line
 * up when they share a row.
 *
 * Native rather than the Radix Select used in the navbar: inside a form
 * submitted through a Server Action, a native control posts its value with no
 * client wiring, and on a phone it opens the OS picker.
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
    <select
      data-slot="native-select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  );
}
