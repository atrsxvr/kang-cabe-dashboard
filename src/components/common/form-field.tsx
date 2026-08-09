import { Label } from "@/components/ui/label";

/**
 * Was copy-pasted into four dialogs, each drifting slightly. One of them was
 * missing `content-start`, which is what made a field with a hint stretch its
 * neighbour out of alignment.
 */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** `<input type="date">` wants YYYY-MM-DD, read in the garden's timezone. */
export function dateInputValue(date: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}
