"use client";

import { useState } from "react";

import { Field } from "@/components/common/form-field";
import { RupiahInput } from "@/components/common/rupiah-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseAmount } from "@/lib/dose";
import { formatRupiah } from "@/lib/money";
import {
  formatStock,
  priceBases,
  totalFromUnitPrice,
  unitPriceFromTotal,
} from "@/lib/stock";

/** Which way the price is typed: per one of the quoted units, or the total. */
export type PriceMode = "unit" | "total";

/**
 * A price typed the way it was quoted — per kg, per ml, per pack, or as the
 * total on the receipt.
 *
 * The server only ever stores the total, so every form that asks for money
 * against a quantity used to make the person do the multiplication in their
 * head, on a phone, in a garden. Typed the other way round, the per-kg price
 * lands where the total belongs and the material reads five times dearer than
 * it is, with nothing on screen to say so. Here any of them is accepted, and
 * the total is always shown back.
 *
 * Every choice is the same sum with a different divisor: per kg divides by
 * 1000 grams, per pack by however much the pack holds. The pack's size starts
 * from the material's usual pack and can be changed for this one entry — a
 * bigger bag bought once does not change what is usually bought.
 *
 * The total is the source of truth: it is what the hidden field posts. A unit
 * price only rewrites it when it is actually typed, so opening a saved value
 * and saving again leaves it alone even where the unit price had to be
 * rounded for display.
 */
export function PriceField({
  id,
  name,
  totalLabel,
  quantity,
  unit,
  packName = null,
  packSize = null,
  initialTotal = null,
  defaultMode,
  error,
  emptyHint,
}: {
  id: string;
  /** The form field the total is posted under. */
  name: string;
  /** Label in total mode — the one the field has always had. */
  totalLabel: string;
  quantity: number;
  unit: string;
  /** The material's usual pack, e.g. "bungkus" holding 1000 gram. */
  packName?: string | null;
  packSize?: number | null;
  initialTotal?: number | null;
  /** "unit" starts on the largest quoted unit: per kg, per liter, per pcs. */
  defaultMode: PriceMode;
  error?: string;
  /** Shown while nothing is typed yet. */
  emptyHint: string;
}) {
  // The pack size typed for this entry only. Until it is touched it follows
  // the material's usual pack, which on the new-material form is still being
  // typed further up.
  const [packInput, setPackInput] = useState<string | null>(null);
  const packText = packInput ?? (packSize ? String(packSize) : "");
  const packPer = parseAmount(packText);

  const packLabel = packName?.trim() || "kemasan";
  const choices = [
    ...priceBases(unit).map((basis) => ({ ...basis, pack: false })),
    { label: packLabel, per: packPer > 0 ? packPer : 0, pack: true },
  ];

  // An index into `choices`, or null for the total. "Per gram" disappears if
  // the unit is switched to pcs mid-form; fall back to the first choice rather
  // than to one no button shows as selected.
  const [picked, setPicked] = useState<number | null>(
    defaultMode === "unit" ? 0 : null
  );
  const choice =
    picked === null ? null : picked < choices.length ? picked : 0;
  const basis = choice !== null ? choices[choice] : null;

  const [total, setTotal] = useState(
    initialTotal !== null ? String(initialTotal) : ""
  );
  const [price, setPrice] = useState(() => {
    if (initialTotal === null || !basis || basis.per <= 0) return "";
    const derived = unitPriceFromTotal(initialTotal, quantity, basis.per);
    return derived !== null ? String(derived) : "";
  });
  // Whether the unit price is what the total follows. Off until it is typed,
  // so a saved total is not rewritten by its own rounded echo.
  const [priceDriven, setPriceDriven] = useState(false);

  const totalValue =
    basis && priceDriven
      ? price === "" || basis.per <= 0
        ? ""
        : String(totalFromUnitPrice(Number(price), quantity, basis.per))
      : total;

  const amount = totalValue === "" ? null : Number(totalValue);

  const select = (next: number | null) => {
    if (next === choice) return;
    // Carry the figure across, so switching just to look never loses it:
    // whatever was typed becomes the total, and the new unit price is read
    // back from that total.
    setTotal(totalValue);
    const per = next !== null ? choices[next].per : 0;
    if (next !== null && amount !== null && per > 0) {
      const derived = unitPriceFromTotal(amount, quantity, per);
      setPrice(derived !== null ? String(derived) : "");
    } else {
      setPrice("");
    }
    setPriceDriven(false);
    setPicked(next);
  };

  // The total read back per the largest quoted unit, so a figure five times
  // too big shows up as a price nobody pays.
  const check = choices[0];
  const checkPrice =
    amount !== null ? unitPriceFromTotal(amount, quantity, check.per) : null;

  let hint: string;
  if (basis?.pack && basis.per <= 0) {
    hint = `Isi kemasannya dulu — berapa ${unit} dalam satu ${packLabel}.`;
  } else if (amount === null) {
    hint = emptyHint;
  } else if (basis) {
    hint =
      quantity > 0
        ? `Total ${formatRupiah(amount)} untuk ${formatStock(quantity, unit)}` +
          (basis.pack && checkPrice !== null
            ? ` · ${formatRupiah(checkPrice)}/${check.label}`
            : "")
        : "Isi jumlahnya dulu — totalnya dihitung dari situ.";
  } else {
    hint =
      checkPrice !== null
        ? `${formatRupiah(amount)} · kira-kira ${formatRupiah(checkPrice)}/${check.label}`
        : formatRupiah(amount);
  }

  return (
    <Field
      id={id}
      label={basis ? `Harga per ${basis.label} (Rp)` : totalLabel}
      error={error}
    >
      {/* Wraps rather than scrolls: four choices are one line too many at
          360px, and a choice hidden off the edge is a choice nobody finds. */}
      <div
        role="group"
        aria-label="Cara mengisi harga"
        className="bg-muted flex w-fit max-w-full flex-wrap gap-1 rounded-lg p-1"
      >
        {choices.map((option, index) => (
          <Choice
            key={option.pack ? "pack" : option.label}
            active={choice === index}
            onClick={() => select(index)}
          >
            Per {option.label}
          </Choice>
        ))}
        <Choice active={choice === null} onClick={() => select(null)}>
          Total
        </Choice>
      </div>

      {basis ? (
        <RupiahInput
          id={id}
          value={price}
          onValueChange={(digits) => {
            setPrice(digits);
            setPriceDriven(true);
          }}
          placeholder={basis.per > 1 ? "25.000" : "150"}
          aria-invalid={Boolean(error)}
        />
      ) : (
        <RupiahInput
          id={id}
          value={total}
          onValueChange={setTotal}
          placeholder="160.000"
          aria-invalid={Boolean(error)}
        />
      )}

      {basis?.pack ? (
        <div className="flex items-center gap-2">
          <label
            htmlFor={`${id}-pack`}
            className="text-muted-foreground shrink-0 text-xs"
          >
            Isi {packLabel} ini
          </label>
          <Input
            id={`${id}-pack`}
            inputMode="decimal"
            value={packText}
            onChange={(event) => {
              setPackInput(event.target.value);
              // A new size re-prices what was typed against it.
              if (price !== "") setPriceDriven(true);
            }}
            placeholder="1000"
            className="h-8 w-28"
          />
          <span className="text-muted-foreground text-xs">{unit}</span>
        </div>
      ) : null}

      <input type="hidden" name={name} value={totalValue} />

      <p className="text-muted-foreground text-xs" aria-live="polite">
        {hint}
      </p>
    </Field>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-pressed={active}
      // 32px tall: tapped one-handed, beside a field that takes money.
      className={
        active
          ? "bg-background hover:bg-background h-8 shrink-0 shadow-xs"
          : "text-muted-foreground h-8 shrink-0"
      }
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
