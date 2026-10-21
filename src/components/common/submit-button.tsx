"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Must live inside a <form> — useFormStatus reads the enclosing form's pending
 * state, so it cannot be lifted into the component that owns the form.
 */
export function SubmitButton({
  children,
  pendingLabel,
  busy = false,
  ...props
}: React.ComponentProps<typeof Button> & {
  pendingLabel?: string;
  /** Still busy after the action returned — e.g. waiting for the refresh
   *  that will show what was saved. */
  busy?: boolean;
}) {
  const { pending: submitting } = useFormStatus();
  const pending = submitting || busy;

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
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
