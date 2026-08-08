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

export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  // Carried so the mutation can prove the task belongs to the season the user
  // is actually looking at.
  seasonId: z.string().min(1),
  status: z.enum(taskStatuses),
});
