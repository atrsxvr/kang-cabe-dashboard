import { z } from "zod";

/**
 * Pure schemas, importable from tests and from client components that want to
 * mirror the rules. No `server-only` here on purpose.
 */

export const seasonStatuses = [
  "PLANNING",
  "ACTIVE",
  "HARVESTING",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const taskStatuses = ["TODO", "IN_PROGRESS", "DONE"] as const;

/** Advancing order for the season lifecycle button. ARCHIVED is a side exit. */
export const seasonProgression = [
  "PLANNING",
  "ACTIVE",
  "HARVESTING",
  "COMPLETED",
] as const;

export function nextSeasonStatus(
  current: (typeof seasonStatuses)[number]
): (typeof seasonProgression)[number] | null {
  const index = seasonProgression.indexOf(
    current as (typeof seasonProgression)[number]
  );
  if (index === -1 || index === seasonProgression.length - 1) return null;
  return seasonProgression[index + 1];
}

export const createSeasonSchema = z.object({
  name: z.string().trim().min(3, "Nama musim minimal 3 karakter").max(120),
  variety: z.string().trim().min(2, "Varietas benih wajib diisi").max(120),
  plantCount: z.coerce
    .number()
    .int("Jumlah populasi harus bilangan bulat")
    .positive("Jumlah populasi harus lebih dari 0")
    .max(10_000_000),
  startDate: z.coerce.date("Tanggal tanam tidak valid"),
  status: z.enum(seasonStatuses),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CreateSeasonInput = z.input<typeof createSeasonSchema>;

export const createTaskSchema = z.object({
  seasonId: z.string().min(1, "Musim tanam belum dipilih"),
  title: z.string().trim().min(3, "Judul tugas minimal 3 karakter").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  hst: z.coerce
    .number()
    .int("HST harus bilangan bulat")
    .min(0, "HST tidak boleh negatif")
    .max(1000)
    .optional(),
  dueDate: z.coerce.date("Tanggal jatuh tempo tidak valid"),
  status: z.enum(taskStatuses),
  assigneeIds: z.array(z.string().min(1)).default([]),
  recipeId: z.string().optional().or(z.literal("")),
  recipeVolumeL: z.coerce.number().positive().max(10_000).optional(),
  /// Snapshot of the recipe's amounts, serialised by the form.
  materials: z
    .array(
      z.object({
        materialId: z.string().min(1),
        amount: z.coerce.number().positive(),
      })
    )
    .default([]),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const recordTaskUsageSchema = z.object({
  taskId: z.string().min(1),
  seasonId: z.string().min(1),
  actorId: z.string().optional().or(z.literal("")),
});

export const findingStatuses = [
  "REPORTED",
  "DIAGNOSED",
  "TREATED",
  "RESOLVED",
] as const;

export const severities = ["LOW", "MEDIUM", "HIGH"] as const;

export const createFindingSchema = z.object({
  seasonId: z.string().min(1, "Musim tanam belum dipilih"),
  hst: z.coerce
    .number()
    .int("HST harus bilangan bulat")
    .min(0, "HST tidak boleh negatif")
    .max(1000),
  symptoms: z
    .string()
    .trim()
    .min(10, "Jelaskan gejalanya minimal 10 karakter")
    .max(2000),
  severity: z.enum(severities),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  reportedById: z.string().optional().or(z.literal("")),
  photoUrl: z.url().optional().or(z.literal("")),
});

export const diagnoseFindingSchema = z.object({
  findingId: z.string().min(1),
  // Carried so the mutation cannot reach a finding in another season.
  seasonId: z.string().min(1),
  diagnosis: z.string().trim().min(5, "Diagnosa minimal 5 karakter").max(2000),
  treatment: z
    .string()
    .trim()
    .min(5, "Tuliskan perlakuan yang disarankan")
    .max(2000),
  diagnosedById: z.string().optional().or(z.literal("")),
});

export const updateFindingStatusSchema = z.object({
  findingId: z.string().min(1),
  seasonId: z.string().min(1),
  status: z.enum(findingStatuses),
});

/** A finding cannot be marked treated before anyone has diagnosed it. */
export function canAdvanceFinding(
  current: (typeof findingStatuses)[number],
  target: (typeof findingStatuses)[number]
): boolean {
  if (current === target) return false;
  if (current === "REPORTED") return target === "DIAGNOSED";
  return findingStatuses.indexOf(target) > findingStatuses.indexOf(current);
}

export const growthPhases = ["VEGETATIVE", "GENERATIVE", "PRODUCTION"] as const;
export const recipeKinds = ["ROUTINE", "TREATMENT"] as const;
export const applicationMethods = ["KOCOR", "SEMPROT"] as const;
export const materialCategories = [
  "FERTILIZER",
  "PESTICIDE",
  "FUNGICIDE",
  "GROWTH_REGULATOR",
  "SEED",
  "MULCH",
  "SUPPLIES",
  "OTHER",
] as const;

export const createMaterialSchema = z.object({
  name: z.string().trim().min(2, "Nama bahan minimal 2 karakter").max(120),
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(16),
  category: z.enum(materialCategories),
  stock: z.coerce.number().min(0, "Stok tidak boleh negatif").max(10_000_000),
  minStock: z.coerce
    .number()
    .min(0, "Batas minimum tidak boleh negatif")
    .max(10_000_000),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const stockReasons = ["PURCHASE", "USAGE", "CORRECTION", "LOSS"] as const;

export const adjustStockSchema = z
  .object({
    materialId: z.string().min(1),
    delta: z.coerce.number("Jumlah tidak valid"),
    reason: z.enum(stockReasons),
    note: z.string().trim().max(300).optional().or(z.literal("")),
    actorId: z.string().optional().or(z.literal("")),
  })
  // A zero movement records nothing and clutters the history.
  .refine((value) => value.delta !== 0, {
    message: "Jumlah tidak boleh nol",
    path: ["delta"],
  });

export const toolConditions = ["GOOD", "NEEDS_SERVICE", "BROKEN"] as const;

export const createToolSchema = z.object({
  name: z.string().trim().min(2, "Nama alat minimal 2 karakter").max(120),
  quantity: z.coerce
    .number()
    .int("Jumlah harus bilangan bulat")
    .min(1, "Jumlah minimal 1")
    .max(1000),
  condition: z.enum(toolConditions),
  lastServicedAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateToolSchema = createToolSchema.extend({
  toolId: z.string().min(1),
});

export const toolEventTypes = [
  "ACQUIRED",
  "LOST",
  "RETIRED",
  "DAMAGED",
  "SERVICED",
] as const;

/** Only these change how many we own; the rest just change condition. */
export const QUANTITY_EVENTS = ["ACQUIRED", "LOST", "RETIRED"] as const;

export function changesQuantity(
  type: (typeof toolEventTypes)[number]
): boolean {
  return (QUANTITY_EVENTS as readonly string[]).includes(type);
}

export const recordToolEventSchema = z.object({
  toolId: z.string().min(1),
  type: z.enum(toolEventTypes),
  quantity: z.coerce
    .number()
    .int("Jumlah harus bilangan bulat")
    .min(1, "Jumlah minimal 1")
    .max(1000),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  actorId: z.string().optional().or(z.literal("")),
});

export const createShoppingNoteSchema = z.object({
  text: z.string().trim().min(2, "Tulis dulu apa yang perlu dibeli").max(200),
  actorId: z.string().optional().or(z.literal("")),
});

export const toggleShoppingNoteSchema = z.object({
  noteId: z.string().min(1),
  done: z.enum(["true", "false"]),
});

const recipeItemSchema = z.object({
  materialId: z.string().min(1),
  amountPerLiter: z.coerce
    .number()
    .positive("Takaran harus lebih dari 0")
    .max(100_000),
});

export const createRecipeSchema = z
  .object({
    name: z.string().trim().min(3, "Nama racikan minimal 3 karakter").max(160),
    kind: z.enum(recipeKinds),
    method: z.enum(applicationMethods),
    phase: z.enum(growthPhases).optional(),
    targetIssue: z.string().trim().max(160).optional().or(z.literal("")),
    intervalDays: z.coerce.number().int().min(1).max(365).optional(),
    basisVolumeL: z.coerce
      .number()
      .positive("Volume acuan harus lebih dari 0")
      .max(10_000),
    preHarvestIntervalDays: z.coerce.number().int().min(0).max(365).optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    items: z.array(recipeItemSchema).min(1, "Tambahkan minimal satu bahan"),
  })
  // A routine recipe without a phase cannot answer "what does this phase
  // need", and a treatment without a target cannot be found when it is needed.
  .refine((r) => r.kind !== "ROUTINE" || Boolean(r.phase), {
    message: "Racikan rutin harus punya fase",
    path: ["phase"],
  })
  .refine((r) => r.kind !== "TREATMENT" || Boolean(r.targetIssue), {
    message: "Racikan penanganan harus menyebut masalah yang disasar",
    path: ["targetIssue"],
  })
  .refine(
    (r) => new Set(r.items.map((i) => i.materialId)).size === r.items.length,
    { message: "Bahan yang sama tercantum dua kali", path: ["items"] }
  );

/**
 * Update schemas reuse the create shapes with an id bolted on. Keeping them
 * derived means a rule added to creation cannot be quietly skipped on edit.
 */
export const updateSeasonSchema = createSeasonSchema.extend({
  seasonId: z.string().min(1),
});

export const updateTaskSchema = createTaskSchema.extend({
  taskId: z.string().min(1),
});

export const updateFindingSchema = createFindingSchema.extend({
  findingId: z.string().min(1),
});

export const updateRecipeSchema = createRecipeSchema.safeExtend({
  recipeId: z.string().min(1),
});

export const updateMaterialSchema = createMaterialSchema.extend({
  materialId: z.string().min(1),
});

export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  // Carried so the mutation can prove the task belongs to the season the user
  // is actually looking at.
  seasonId: z.string().min(1),
  status: z.enum(taskStatuses),
});

/**
 * A physical count of the shed. This is the job that belongs to logistics: the
 * board deducts what a task *planned* to use, and only someone standing in
 * front of the sacks can say what is actually there.
 */
export const stockOpnameSchema = z.object({
  actorId: z.string().optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  counts: z
    .array(
      z.object({
        materialId: z.string().min(1),
        counted: z.coerce.number("Hitungan tidak valid").min(0).max(1_000_000),
      })
    )
    .min(1, "Tidak ada bahan untuk dihitung"),
});
