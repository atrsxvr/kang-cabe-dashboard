"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { materialCategoryLabels } from "@/components/inventory/inventory-labels";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type MaterialOption = {
  id: string;
  name: string;
  unit: string;
  category: string;
};

/** Category order is the Inventaris order: what feeds, what protects, the rest. */
const CATEGORY_ORDER = Object.keys(materialCategoryLabels);

function grouped(materials: MaterialOption[]) {
  const rank = (category: string) => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  return [...materials].sort(
    (a, b) => rank(a.category) - rank(b.category) || a.name.localeCompare(b.name, "id")
  );
}

/**
 * Picking a material by typing part of its name, from a list grouped by
 * category.
 *
 * A plain select stopped working once the shed held a few dozen materials:
 * on a phone it opens a wheel that has to be spun past every fertiliser to
 * reach a fungicide. Here "fung" or "npk" narrows it at once.
 *
 * Built by hand rather than from a library: one input, one list, and the
 * keyboard keys a combobox is expected to answer to. `name` adds a hidden
 * input, so it submits with a plain form like the select it replaces.
 */
export function MaterialCombobox({
  id,
  name,
  materials,
  value,
  onChange,
  describe,
  placeholder = "Ketik untuk mencari bahan",
  invalid = false,
}: {
  id: string;
  name?: string;
  materials: MaterialOption[];
  value: string;
  onChange: (id: string) => void;
  /** Extra text after the name in the list, e.g. the stock on hand. */
  describe?: (material: MaterialOption) => string;
  placeholder?: string;
  invalid?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = materials.find((material) => material.id === value) ?? null;

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return grouped(
      needle
        ? materials.filter((material) => material.name.toLowerCase().includes(needle))
        : materials
    );
  }, [materials, query]);

  const choose = (material: MaterialOption) => {
    onChange(material.id);
    setOpen(false);
    setQuery("");
  };

  const move = (step: number) => {
    if (!matches.length) return;
    const next = (active + step + matches.length) % matches.length;
    setActive(next);
    listRef.current
      ?.querySelector(`[data-index="${next}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  let lastCategory: string | null = null;

  return (
    <div className="relative">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].id}` : undefined}
        aria-invalid={invalid}
        autoComplete="off"
        className="pr-8"
        placeholder={selected && !open ? undefined : placeholder}
        value={open ? query : (selected?.name ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setActive(0);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        // Closed a beat later: on a phone the tap on an option arrives after
        // the input has already lost focus, and closing at once would
        // swallow it.
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) setOpen(true);
            else move(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "Enter" && open) {
            // Inside a form, Enter would otherwise submit it half-filled.
            event.preventDefault();
            if (matches[active]) choose(matches[active]);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      />
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 shadow-md"
        >
          {matches.length === 0 ? (
            <li className="text-muted-foreground px-2 py-3 text-center text-sm">
              Tidak ada bahan bernama &ldquo;{query.trim()}&rdquo;.
            </li>
          ) : (
            matches.map((material, index) => {
              const heading =
                material.category !== lastCategory
                  ? (materialCategoryLabels[material.category] ?? material.category)
                  : null;
              lastCategory = material.category;
              return (
                <li key={material.id} role="presentation">
                  {heading ? (
                    <p className="text-muted-foreground px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide uppercase">
                      {heading}
                    </p>
                  ) : null}
                  <div
                    id={`${listId}-${material.id}`}
                    role="option"
                    aria-selected={material.id === value}
                    data-index={index}
                    // Keeps focus in the input on a desktop; the choice itself is
                    // the click, which a phone's tap also produces.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(material)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm",
                      index === active && "bg-accent text-accent-foreground",
                      material.id === value && "font-medium",
                    )}
                  >
                    <span className="min-w-0 truncate">{material.name}</span>
                    {describe ? (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {describe(material)}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
