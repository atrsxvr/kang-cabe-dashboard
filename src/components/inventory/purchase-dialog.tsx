"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";

import { Field, dateInputValue } from "@/components/common/form-field";
import { MaterialCombobox } from "@/components/common/material-combobox";
import { NativeSelect } from "@/components/common/native-select";
import { RupiahInput } from "@/components/common/rupiah-input";
import { SubmitButton } from "@/components/common/submit-button";
import {
  UNIT_OPTIONS,
  materialCategoryLabels,
} from "@/components/inventory/inventory-labels";
import { PriceField } from "@/components/inventory/price-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { amountToInput, parseAmount } from "@/lib/dose";
import { formatRupiah } from "@/lib/money";
import { formatStock } from "@/lib/stock";
import { recordPurchase } from "@/server/actions/inventory";
import type {
  PurchaseLine,
  materialCategories,
} from "@/server/actions/schemas";
import type { StockRow, ToolRow } from "@/server/queries/inventory";
import type { MemberOption } from "@/server/queries/users";

type Kind = "material" | "tool";
type MaterialCategory = (typeof materialCategories)[number];
type Source = "existing" | "new";

/** Opens the form with one item already chosen — from a row, or the shopping list. */
export type PurchasePreset =
  | { kind: "material"; id: string; amount?: number }
  | { kind: "tool"; id: string; quantity?: number };

/** The item being typed, before it joins the list. */
type Draft = {
  kind: Kind;
  source: Source;
  pickedId: string;
  name: string;
  unit: string;
  category: string;
  minStock: string;
  amount: string;
  /** Bare digits, or "" for "nota belum ada". */
  total: string;
};

type Row = {
  key: number;
  line: PurchaseLine;
  label: string;
  amountText: string;
  isNew: boolean;
};

function blankDraft(kind: Kind = "material"): Draft {
  return {
    kind,
    source: "existing",
    pickedId: "",
    name: "",
    unit: "gram",
    category: "FERTILIZER",
    minStock: "0",
    amount: kind === "tool" ? "1" : "",
    total: "",
  };
}

function draftFrom(preset?: PurchasePreset): Draft {
  if (!preset) return blankDraft();
  const draft = blankDraft(preset.kind);
  draft.pickedId = preset.id;
  if (preset.kind === "material" && preset.amount) {
    draft.amount = amountToInput(preset.amount);
  }
  if (preset.kind === "tool" && preset.quantity) {
    draft.amount = String(preset.quantity);
  }
  return draft;
}

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * A shopping trip, recorded by hand: several materials and tools, new or
 * already in the shed, on the day they were bought.
 *
 * Every priced line leaves the kas on that day. Buying is not a season's cost
 * — that comes later, when a task's usage is recorded — so nothing here asks
 * for a season.
 *
 * Opened with a `preset` — from a material's row or the shopping list — it
 * is locked to that one item.
 *
 * Items are added to a list one at a time, like the materials on a task. The
 * one still being typed when Simpan is pressed is saved with the rest: a
 * single-item trip — the usual case — should not need two buttons.
 */
type Sources = {
  materials: StockRow[];
  tools: ToolRow[];
  members: MemberOption[];
  /** Registering a material is its own permission; buying one is not. */
  canRegisterMaterials: boolean;
};

const PurchaseSources = createContext<Sources | null>(null);

/**
 * What every "Catat Belanja" on the page picks from. Provided once by the
 * page, so a row's buy button does not have to carry the whole shed through
 * the table that renders it.
 */
export function PurchaseSourcesProvider({
  children,
  ...sources
}: Sources & { children: React.ReactNode }) {
  return (
    <PurchaseSources.Provider value={sources}>
      {children}
    </PurchaseSources.Provider>
  );
}

export function PurchaseDialog({
  preset,
  trigger,
}: {
  preset?: PurchasePreset;
  trigger?: React.ReactNode;
}) {
  const sources = useContext(PurchaseSources);
  if (!sources) {
    throw new Error("PurchaseDialog needs a PurchaseSourcesProvider above it.");
  }
  const { materials, tools, members, canRegisterMaterials } = sources;

  const uid = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(preset));
  const [draftError, setDraftError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // PriceField keeps its own state; a new key is how it is emptied.
  const [priceKey, setPriceKey] = useState(0);
  const nextKey = useRef(0);

  const today = dateInputValue();

  const reset = () => {
    setRows([]);
    setDraft(draftFrom(preset));
    setDraftError("");
    setErrors({});
    setPriceKey((key) => key + 1);
  };

  const patch = (changes: Partial<Draft>) => {
    setDraftError("");
    setDraft((current) => ({ ...current, ...changes }));
  };

  // Stable, and a no-op when nothing changed: PriceField reports on every
  // render of the total, and a fresh object each time would loop.
  const setTotal = useCallback((total: string) => {
    setDraft((current) =>
      current.total === total ? current : { ...current, total },
    );
  }, []);

  const switchKind = (kind: Kind) => {
    if (kind === draft.kind) return;
    setDraftError("");
    setDraft(blankDraft(kind));
    setPriceKey((key) => key + 1);
  };

  const switchSource = (source: Source) => {
    if (source === draft.source) return;
    setDraftError("");
    setDraft((current) => ({ ...current, source, pickedId: "", name: "" }));
  };

  // Already on the list: offered again, it would only be refused as a duplicate.
  const materialOptions = useMemo(() => {
    const taken = new Set(
      rows.flatMap((row) =>
        row.line.kind === "material" && row.line.materialId
          ? [row.line.materialId]
          : [],
      ),
    );
    return materials.filter((row) => !taken.has(row.id));
  }, [materials, rows]);

  const toolOptions = useMemo(() => {
    const taken = new Set(
      rows.flatMap((row) =>
        row.line.kind === "tool" && row.line.toolId ? [row.line.toolId] : [],
      ),
    );
    return tools
      .filter((tool) => !taken.has(tool.id))
      .map((tool) => ({
        id: tool.id,
        name: tool.name,
        unit: "unit",
        category: "Alat",
      }));
  }, [tools, rows]);

  const picked =
    draft.kind === "material"
      ? (materials.find((row) => row.id === draft.pickedId) ?? null)
      : null;
  const pickedTool =
    draft.kind === "tool"
      ? (tools.find((tool) => tool.id === draft.pickedId) ?? null)
      : null;

  // Typing a name that already exists is the commonest way a shed ends up
  // with "NPK" and "npk" as two materials. Caught here, with a way out.
  const twin =
    draft.source === "new" && draft.name.trim()
      ? draft.kind === "material"
        ? (materials.find((row) => same(row.name, draft.name)) ?? null)
        : (tools.find((tool) => same(tool.name, draft.name)) ?? null)
      : null;

  const unit =
    draft.kind === "material" ? (picked?.unit ?? draft.unit) : "unit";

  /**
   * The draft as a line, or a reason it is not one yet, or null when nothing
   * has been started.
   */
  function build(current: Draft): Omit<Row, "key"> | string | null {
    const empty =
      current.source === "existing" ? !current.pickedId : !current.name.trim();
    if (empty) return null;

    const totalCost = current.total === "" ? null : Number(current.total);
    const amount = parseAmount(current.amount);

    if (current.kind === "material") {
      if (!Number.isFinite(amount) || amount <= 0) {
        return "Isi jumlah yang dibeli.";
      }

      if (current.source === "existing") {
        const material = materials.find((row) => row.id === current.pickedId);
        if (!material) return "Pilih bahannya dulu.";
        return {
          line: {
            kind: "material",
            materialId: material.id,
            amount,
            totalCost,
          },
          label: material.name,
          amountText: formatStock(amount, material.unit),
          isNew: false,
        };
      }

      const name = current.name.trim();
      if (name.length < 2) return "Nama bahan minimal 2 karakter.";
      if (twin) return `${twin.name} sudah ada — pilih dari yang sudah ada.`;
      if (
        rows.some(
          (row) =>
            row.line.kind === "material" &&
            row.line.newMaterial &&
            same(row.line.newMaterial.name, name),
        )
      ) {
        return `${name} sudah ada di daftar belanja ini.`;
      }
      const minStock = parseAmount(current.minStock);
      if (!Number.isFinite(minStock) || minStock < 0) {
        return "Batas minimum tidak valid.";
      }
      return {
        line: {
          kind: "material",
          newMaterial: {
            name,
            unit: current.unit,
            category: current.category as MaterialCategory,
            minStock,
          },
          amount,
          totalCost,
        },
        label: name,
        amountText: formatStock(amount, current.unit),
        isNew: true,
      };
    }

    if (!Number.isInteger(amount) || amount < 1) {
      return "Jumlah alat minimal 1, bilangan bulat.";
    }

    if (current.source === "existing") {
      const tool = tools.find((row) => row.id === current.pickedId);
      if (!tool) return "Pilih alatnya dulu.";
      return {
        line: { kind: "tool", toolId: tool.id, quantity: amount, totalCost },
        label: tool.name,
        amountText: `${amount} unit`,
        isNew: false,
      };
    }

    const name = current.name.trim();
    if (name.length < 2) return "Nama alat minimal 2 karakter.";
    if (twin) return `${twin.name} sudah ada — pilih dari yang sudah ada.`;
    if (
      rows.some(
        (row) =>
          row.line.kind === "tool" &&
          row.line.newTool &&
          same(row.line.newTool.name, name),
      )
    ) {
      return `${name} sudah ada di daftar belanja ini.`;
    }
    return {
      line: { kind: "tool", newTool: { name }, quantity: amount, totalCost },
      label: name,
      amountText: `${amount} unit`,
      isNew: true,
    };
  }

  const built = build(draft);

  const add = () => {
    if (built === null) return;
    if (typeof built === "string") {
      setDraftError(built);
      return;
    }
    const key = nextKey.current++;
    setRows((current) => [...current, { ...built, key }]);
    setDraft(blankDraft(draft.kind));
    setDraftError("");
    setPriceKey((key) => key + 1);
  };

  const sum = (list: Row[]) =>
    list.reduce((total, row) => total + (row.line.totalCost ?? 0), 0);
  const unpriced = rows.filter((row) => row.line.totalCost === null).length;

  async function onSubmit(formData: FormData) {
    if (typeof built === "string") {
      setDraftError(built);
      toast.error("Barang yang sedang diisi belum lengkap.");
      return;
    }
    const all = built ? [...rows, { ...built, key: -1 }] : rows;
    if (all.length === 0) {
      setDraftError("Pilih atau isi barang yang dibeli.");
      toast.error("Belum ada barang yang dibeli.");
      return;
    }

    formData.set("items", JSON.stringify(all.map((row) => row.line)));
    const result = await recordPurchase(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    const spent = sum(all);
    setOpen(false);
    reset();
    toast.success(
      `Belanja tercatat: ${all.length} barang` +
        (spent > 0 ? `, ${formatRupiah(spent)} keluar dari kas.` : "."),
    );
    router.refresh();
  }

  const newDisabled = draft.kind === "material" && !canRegisterMaterials;

  // Opened from one material's row or one shopping-list line: that item is the
  // whole question, so nothing else is offered. Several items at once is what
  // the Catat Belanja button at the top of the page is for.
  const locked = Boolean(preset);
  const lockedName = picked?.name ?? pickedTool?.name ?? "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <ShoppingCart className="size-4" aria-hidden />
            Catat Belanja
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {locked ? `Belanja ${lockedName}` : "Catat Belanja"}
          </DialogTitle>
          <DialogDescription>
            {locked
              ? picked
                ? `Stok sekarang ${formatStock(picked.stock, picked.unit)}. `
                : pickedTool
                  ? `Sekarang ada ${pickedTool.quantity} unit. `
                  : ""
              : "Bahan dan alat yang dibeli pakai uang kas. "}
            Yang ada harganya langsung tercatat sebagai pengeluaran kas di
            tanggal belanjanya.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${uid}-date`}
              label="Tanggal Belanja"
              error={errors.purchasedAt}
            >
              <Input
                id={`${uid}-date`}
                name="purchasedAt"
                type="date"
                required
                max={today}
                defaultValue={today}
                aria-invalid={Boolean(errors.purchasedAt)}
              />
            </Field>

            <Field
              id={`${uid}-actor`}
              label="Dicatat oleh"
              error={errors.actorId}
            >
              <NativeSelect id={`${uid}-actor`} name="actorId" defaultValue="">
                <option value="">— tidak disebutkan —</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {rows.length > 0 ? (
            <div className="grid gap-2">
              <ul
                className="divide-y rounded-md border"
                aria-label="Daftar belanja"
              >
                {rows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center gap-2 py-1.5 pr-1 pl-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                        <span className="min-w-0 break-words">{row.label}</span>
                        {row.isNew ? (
                          <Badge variant="secondary">baru</Badge>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {row.amountText} ·{" "}
                        {row.line.totalCost === null
                          ? "harga belum diisi"
                          : formatRupiah(row.line.totalCost)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                      aria-label={`Hapus ${row.label} dari daftar`}
                      onClick={() =>
                        setRows((current) =>
                          current.filter((item) => item.key !== row.key),
                        )
                      }
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="text-sm tabular-nums">
                Total belanja{" "}
                <span className="font-semibold">{formatRupiah(sum(rows))}</span>
                {unpriced > 0 ? (
                  <span className="text-muted-foreground text-xs">
                    {" "}
                    · {unpriced} belum ada harganya, kas baru berkurang setelah
                    diisi di Riwayat
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}

          <fieldset className="bg-muted/40 grid gap-3 rounded-md border p-3">
            <legend className="sr-only">Barang yang dibeli</legend>
            {locked ? null : (
              <>
                <p className="text-xs font-medium">
                  {rows.length > 0
                    ? "Tambah barang lain"
                    : "Barang yang dibeli"}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Segmented
                    label="Jenis barang"
                    value={draft.kind}
                    options={[
                      { value: "material", label: "Bahan" },
                      { value: "tool", label: "Alat" },
                    ]}
                    onChange={(value) => switchKind(value as Kind)}
                  />
                  <Segmented
                    label="Sudah terdaftar atau baru"
                    value={draft.source}
                    options={[
                      { value: "existing", label: "Sudah ada" },
                      { value: "new", label: "Baru", disabled: newDisabled },
                    ]}
                    onChange={(value) => switchSource(value as Source)}
                  />
                </div>

                {newDisabled ? (
                  <p className="text-muted-foreground text-xs">
                    Mendaftarkan bahan baru bukan wewenang peranmu. Minta yang
                    mengurus daftar bahan mendaftarkannya dulu.
                  </p>
                ) : null}

                {draft.source === "existing" ? (
                  <Field
                    id={`${uid}-pick`}
                    label={draft.kind === "material" ? "Bahan" : "Alat"}
                  >
                    {draft.kind === "material" ? (
                      <MaterialCombobox
                        id={`${uid}-pick`}
                        materials={materialOptions}
                        value={draft.pickedId}
                        onChange={(id) => patch({ pickedId: id })}
                        describe={(row) => {
                          const stock =
                            materials.find((item) => item.id === row.id)
                              ?.stock ?? 0;
                          return formatStock(stock, row.unit);
                        }}
                      />
                    ) : (
                      <MaterialCombobox
                        id={`${uid}-pick`}
                        materials={toolOptions}
                        value={draft.pickedId}
                        onChange={(id) => patch({ pickedId: id })}
                        placeholder="Ketik untuk mencari alat"
                        noun="alat"
                        describe={(row) =>
                          `${tools.find((tool) => tool.id === row.id)?.quantity ?? 0} unit`
                        }
                      />
                    )}
                  </Field>
                ) : (
                  <>
                    <Field
                      id={`${uid}-name`}
                      label={
                        draft.kind === "material"
                          ? "Nama bahan baru"
                          : "Nama alat baru"
                      }
                    >
                      <Input
                        id={`${uid}-name`}
                        value={draft.name}
                        onChange={(event) =>
                          patch({ name: event.target.value })
                        }
                        placeholder={
                          draft.kind === "material"
                            ? "Mis. NPK 16-16-16"
                            : "Mis. Cangkul"
                        }
                        autoComplete="off"
                      />
                    </Field>

                    {twin ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                        <span>{twin.name} sudah terdaftar.</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              source: "existing",
                              pickedId: twin.id,
                              name: "",
                            }))
                          }
                        >
                          Pakai yang sudah ada
                        </Button>
                      </div>
                    ) : null}

                    {draft.kind === "material" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Field id={`${uid}-unit`} label="Satuan">
                          <NativeSelect
                            id={`${uid}-unit`}
                            value={draft.unit}
                            onChange={(event) =>
                              patch({ unit: event.target.value })
                            }
                          >
                            {UNIT_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </NativeSelect>
                        </Field>
                        <Field id={`${uid}-category`} label="Kategori">
                          <NativeSelect
                            id={`${uid}-category`}
                            value={draft.category}
                            onChange={(event) =>
                              patch({ category: event.target.value })
                            }
                          >
                            {Object.entries(materialCategoryLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </NativeSelect>
                        </Field>
                        <Field
                          id={`${uid}-min`}
                          label="Batas minimum"
                          hint="Di bawah ini masuk daftar belanja"
                        >
                          <Input
                            id={`${uid}-min`}
                            inputMode="decimal"
                            value={draft.minStock}
                            onChange={(event) =>
                              patch({ minStock: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                    ) : null}
                  </>
                )}
              </>
            )}

            <Field id={`${uid}-amount`} label={`Jumlah (${unit})`}>
              <Input
                id={`${uid}-amount`}
                inputMode={draft.kind === "tool" ? "numeric" : "decimal"}
                value={draft.amount}
                onChange={(event) => patch({ amount: event.target.value })}
                className="w-32"
              />
            </Field>

            {draft.kind === "material" ? (
              <PriceField
                key={`price-${priceKey}-${picked?.id ?? draft.unit}`}
                id={`${uid}-cost`}
                name="lineTotal"
                totalLabel="Total bayar (Rp)"
                quantity={(() => {
                  const qty = parseAmount(draft.amount);
                  return Number.isFinite(qty) && qty > 0 ? qty : 0;
                })()}
                unit={unit}
                packName={picked?.purchaseUnit ?? null}
                packSize={picked?.purchaseSize ?? null}
                defaultMode="total"
                emptyHint="Kosongkan kalau notanya belum ada — kas baru berkurang setelah harganya diisi di Riwayat."
                onTotalChange={setTotal}
              />
            ) : (
              <Field
                id={`${uid}-tool-cost`}
                label="Total bayar (Rp)"
                hint="Kosongkan kalau gratis atau notanya belum ada"
              >
                <RupiahInput
                  key={`tool-price-${priceKey}`}
                  id={`${uid}-tool-cost`}
                  value={draft.total}
                  onValueChange={(digits) => patch({ total: digits })}
                />
              </Field>
            )}

            {draft.kind === "tool" && pickedTool && !locked ? (
              <p className="text-muted-foreground text-xs">
                Sekarang ada {pickedTool.quantity} unit.
              </p>
            ) : null}

            {draftError ? (
              <p className="text-destructive text-xs" role="alert">
                {draftError}
              </p>
            ) : null}

            {locked ? null : (
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={built === null}
                  onClick={add}
                >
                  <PackagePlus className="size-4" aria-hidden />
                  Tambahkan ke daftar
                </Button>
              </div>
            )}
          </fieldset>

          <Field
            id={`${uid}-note`}
            label="Catatan (opsional)"
            error={errors.note}
            hint="Nama toko atau nomor nota — ikut tampil di buku kas"
          >
            <Input
              id={`${uid}-note`}
              name="note"
              placeholder="Mis. Toko Tani Makmur"
            />
          </Field>

          {errors.items ? (
            <p className="text-destructive text-sm" role="alert">
              {errors.items}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Batal
            </Button>
            <SubmitButton>Simpan Belanja</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="bg-muted flex w-fit max-w-full flex-wrap gap-1 rounded-lg p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={active}
            disabled={option.disabled}
            // 32px: tapped one-handed, like every other control in the shed.
            className={
              active
                ? "bg-background hover:bg-background h-8 shrink-0 shadow-xs"
                : "text-muted-foreground h-8 shrink-0"
            }
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
