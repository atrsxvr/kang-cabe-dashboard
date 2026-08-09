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
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;

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
  "OTHER",
] as const;

export const createMaterialSchema = z.object({
  name: z.string().trim().min(2, "Nama bahan minimal 2 karakter").max(120),
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(16),
  category: z.enum(materialCategories),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
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

export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  // Carried so the mutation can prove the task belongs to the season the user
  // is actually looking at.
  seasonId: z.string().min(1),
  status: z.enum(taskStatuses),
});
