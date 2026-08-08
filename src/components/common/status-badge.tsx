import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const seasonLabels: Record<string, string> = {
  PLANNING: "Perencanaan",
  ACTIVE: "Berjalan",
  HARVESTING: "Panen",
  COMPLETED: "Selesai",
  ARCHIVED: "Arsip",
};

const taskLabels: Record<string, string> = {
  TODO: "Belum dikerjakan",
  IN_PROGRESS: "Dikerjakan",
  DONE: "Selesai",
};

// Colour carries meaning here, so each pairs with its own text label rather
// than standing alone.
const tones: Record<string, string> = {
  PLANNING: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  ACTIVE: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  HARVESTING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  COMPLETED: "bg-blue-500/12 text-blue-700 dark:text-blue-400",
  ARCHIVED: "bg-muted text-muted-foreground",
  TODO: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  IN_PROGRESS: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  DONE: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
};

export function StatusBadge({
  status,
  kind,
  className,
  block = false,
}: {
  status: string;
  kind: "season" | "task";
  className?: string;
  /**
   * Fills its container instead of hugging the label. Labels differ in length
   * ("Belum dikerjakan" vs "Selesai"), which would otherwise resize a table
   * column every time a status changes.
   */
  block?: boolean;
}) {
  const labels = kind === "season" ? seasonLabels : taskLabels;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent",
        block && "w-full justify-center",
        tones[status],
        className
      )}
    >
      {labels[status] ?? status}
    </Badge>
  );
}
