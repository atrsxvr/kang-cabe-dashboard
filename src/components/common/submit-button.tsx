"use client";

import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Must live inside a <form> — useFormStatus reads the enclosing form's pending
 * state, so it cannot be lifted into the component that owns the form.
 */
export function SubmitButton({
  children,
  pendingLabel,
  busy = false,
  saved = false,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & {
  pendingLabel?: string;
  /** Still busy after the action returned — e.g. waiting for the refresh
   *  that will show what was saved. */
  busy?: boolean;
  /** Saved and shown: a tick for a moment before the dialog closes, so the
   *  last thing seen in it is that it worked. From `useSaveAndRefresh`. */
  saved?: boolean;
}) {
  const { pending: submitting } = useFormStatus();
  const pending = submitting || busy;

  return (
    <Button type="submit" disabled={disabled || pending || saved} {...props}>
      {saved ? (
        <>
          <Check
            className="size-4 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200"
            aria-hidden
          />
          Tersimpan
        </>
      ) : pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {pendingLabel ?? "Menyimpan…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
