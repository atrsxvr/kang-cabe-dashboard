"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { groupThousands } from "@/lib/money";

/**
 * A rupiah field that reads "1.500.000" while it is typed.
 *
 * Seven zeros are where a miskeyed price hides, and on a phone in a garden
 * nobody counts them. The dots are display only: the form posts the bare
 * digits through a hidden input under `name`, so every server schema keeps
 * parsing exactly what it always did — a "1.500" reaching `z.coerce.number()`
 * would otherwise become 1,5.
 *
 * Controlled with `value` + `onValueChange` (both bare digits) when the dialog
 * needs the number as it is typed; otherwise `defaultValue` is enough.
 */
export function RupiahInput({
  name,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "inputMode"
> & {
  value?: string;
  defaultValue?: string | number | null;
  onValueChange?: (digits: string) => void;
}) {
  const [own, setOwn] = useState(() =>
    String(defaultValue ?? "").replace(/[^0-9]/g, "")
  );
  const digits = value ?? own;

  // Re-adding dots moves the text under the caret, and a controlled input
  // then throws the caret to the end — typing into the middle of a price
  // would scatter digits. Remember how many digits sat left of it instead.
  const ref = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = ref.current;
    const wanted = caretDigits.current;
    if (!input || wanted === null || document.activeElement !== input) return;
    caretDigits.current = null;

    let position = 0;
    let seen = 0;
    while (position < input.value.length && seen < wanted) {
      if (/\d/.test(input.value[position])) seen += 1;
      position += 1;
    }
    input.setSelectionRange(position, position);
  });

  return (
    <>
      <Input
        {...props}
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        value={groupThousands(digits)}
        onChange={(event) => {
          const typed = event.target.value;
          const caret = event.target.selectionStart ?? typed.length;
          caretDigits.current = typed.slice(0, caret).replace(/[^0-9]/g, "").length;

          const next = typed.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
          if (value === undefined) setOwn(next);
          onValueChange?.(next);
        }}
      />
      {name ? <input type="hidden" name={name} value={digits} /> : null}
    </>
  );
}
