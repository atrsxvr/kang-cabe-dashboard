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
  /**
   * Kosong itu jawaban yang sah, dan itu sebabnya ia `null` dan bukan nol.
   * Nol akan terbaca sebagai "musim ini tidak diharapkan panen apa pun" lalu
   * dibagi ke dalam BEP; null membuat panduan harga jual memilih diam.
   *
   * Ditulis dengan koma di lapangan — "12,5" harus jadi 12.5, bukan NaN.
   */
  projectedHarvestKg: z.preprocess(
    (value) => {
      // Tiga bentuk "belum diisi" yang sama-sama sah: field yang tidak ada
      // sama sekali, `formData.get` yang mengembalikan null, dan kotak yang
      // dikosongkan. Ketiganya null, bukan NaN.
      if (value === null || value === undefined) return null;
      if (typeof value !== "string") return value;
      const trimmed = value.trim().replace(",", ".");
      return trimmed === "" ? null : trimmed;
    },
    z.coerce
      .number("Isi proyeksi panen dalam angka")
      .positive("Proyeksi panen harus lebih dari 0")
      .max(1_000_000)
      .nullable()
  ),
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

/** Whole rupiah, never a fraction. Blank means "nota belum ada". */
export const rupiah = z.coerce
  .number("Jumlah rupiah tidak valid")
  .int("Tulis rupiah bulat, tanpa koma")
  .min(0, "Tidak boleh minus")
  .max(1_000_000_000);

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
  purchaseUnit: z.string().trim().max(16).optional().or(z.literal("")),
  purchaseSize: z.coerce
    .number("Isi angka")
    .positive("Harus lebih dari 0")
    .max(1_000_000)
    .optional(),
  expiresAt: z.coerce.date("Tanggal tidak valid").optional(),
  /// Nilai rupiah dari stok awal, kalau diketahui. Tanpa ini stok pembuka
  /// dihitung senilai nol dan menarik turun harga rata-rata begitu belanja
  /// pertama masuk.
  openingCost: rupiah.optional(),
});

export const stockReasons = ["PURCHASE", "USAGE", "CORRECTION", "LOSS"] as const;

export const adjustStockSchema = z
  .object({
    materialId: z.string().min(1),
    delta: z.coerce.number("Jumlah tidak valid"),
    reason: z.enum(stockReasons),
    totalCost: rupiah.optional(),
    /// Musim yang menanggung pemakaian ini, kalau bahannya keluar di luar
    /// sebuah tugas. Nilainya dihitung server dari harga rata-rata.
    seasonId: z.string().optional().or(z.literal("")),
    note: z.string().trim().max(300).optional().or(z.literal("")),
    actorId: z.string().optional().or(z.literal("")),
  })
  // A zero movement records nothing and clutters the history.
  .refine((value) => value.delta !== 0, {
    message: "Jumlah tidak boleh nol",
    path: ["delta"],
  })
  // Only buying costs money. A price attached to usage or a correction would
  // silently skew the average, since neither of those is a purchase.
  .refine(
    (value) => value.totalCost === undefined || value.reason === "PURCHASE",
    { message: "Harga hanya untuk belanja", path: ["totalCost"] }
  )
  // Only what leaves the shed can be charged to a season. Buying is not a
  // season's cost — that is the whole basis of how the money side works.
  .refine(
    (value) => !value.seasonId || value.delta < 0,
    { message: "Musim hanya untuk bahan yang keluar", path: ["seasonId"] }
  );

export const archiveMaterialSchema = z.object({
  materialId: z.string().min(1),
  /// Mengembalikan bahan yang sudah diarsipkan.
  restore: z.coerce.boolean().optional(),
});

/** Filling in the price of a purchase after the receipt turns up. */
export const setMovementCostSchema = z.object({
  movementId: z.string().min(1),
  totalCost: rupiah,
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
  /// Servis berkala tiap sekian hari. Kosong berarti tidak dijadwalkan.
  serviceIntervalDays: z.coerce
    .number("Isi jumlah hari")
    .int("Harus bilangan bulat")
    .positive("Harus lebih dari 0")
    .max(3650)
    .optional(),
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
  "CHECKED_OUT",
  "RETURNED",
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
  totalCost: rupiah.optional(),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  actorId: z.string().optional().or(z.literal("")),
  /// Siapa yang membawa alatnya, untuk CHECKED_OUT.
  holderId: z.string().optional().or(z.literal("")),
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

/**
 * Editing a material cannot touch `stock`. The quantity only ever moves
 * through `adjustStock`, `recordTaskUsage` or an opname, each of which writes
 * the movement that explains it — an editable number here would be a way to
 * change the shed with nothing in the log saying who or why.
 */
export const updateMaterialSchema = createMaterialSchema
  .omit({ stock: true, openingCost: true })
  .extend({ materialId: z.string().min(1) });

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

export const chiliGrades = ["GOOD", "REJECT"] as const;

/**
 * Bobot timbangan gantung: satu desimal sudah lebih dari cukup.
 *
 * Komanya dinormalkan lebih dulu — `z.coerce.number()` mengubah "4,5" menjadi
 * NaN, dan orang di kebun menulis koma, bukan titik.
 */
const kilos = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().replace(",", ".") : value),
  z.coerce
    .number("Isi bobot dalam angka")
    .min(0, "Bobot tidak boleh minus")
    .max(100_000)
);

export const createHarvestSchema = z
  .object({
    seasonId: z.string().min(1),
    harvestDate: z.coerce.date("Tanggal panen tidak valid"),
    goodKg: kilos,
    rejectKg: kilos,
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    recordedById: z.string().optional().or(z.literal("")),
  })
  // A picking of nothing is not a picking; it would only pad the log and drag
  // the averages around.
  .refine((value) => value.goodKg + value.rejectKg > 0, {
    message: "Isi bobotnya, minimal salah satu",
    path: ["goodKg"],
  });

export const updateHarvestSchema = z
  .object({
    harvestId: z.string().min(1),
    seasonId: z.string().min(1),
    harvestDate: z.coerce.date("Tanggal panen tidak valid"),
    goodKg: kilos,
    rejectKg: kilos,
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    recordedById: z.string().optional().or(z.literal("")),
  })
  .refine((value) => value.goodKg + value.rejectKg > 0, {
    message: "Isi bobotnya, minimal salah satu",
    path: ["goodKg"],
  });

const saleItem = z.object({
  grade: z.enum(chiliGrades),
  weightKg: z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().replace(",", ".") : value,
    z.coerce
      .number("Isi bobot dalam angka")
      .positive("Harus lebih dari 0")
      .max(100_000)
  ),
  pricePerKg: rupiah.refine((value) => value > 0, "Isi harganya"),
});

const saleBase = {
  seasonId: z.string().min(1),
  soldAt: z.coerce.date("Tanggal penjualan tidak valid"),
  buyerName: z.string().trim().min(2, "Nama pembeli minimal 2 karakter").max(120),
  isPaid: z.coerce.boolean().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  recordedById: z.string().optional().or(z.literal("")),
};

export const createSaleSchema = z.object({
  ...saleBase,
  items: z.array(saleItem).min(1, "Isi minimal satu baris mutu"),
});

export const updateSaleSchema = z.object({
  ...saleBase,
  saleId: z.string().min(1),
  items: z.array(saleItem).min(1, "Isi minimal satu baris mutu"),
});

export const markSalePaidSchema = z.object({
  saleId: z.string().min(1),
  seasonId: z.string().min(1),
  /// Membatalkan penandaan kalau ternyata keliru.
  unpaid: z.coerce.boolean().optional(),
});

export const roles = ["ADMIN", "AGRONOMIST", "LOGISTICS", "SALES"] as const;

const memberBase = {
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  email: z.email("Email tidak valid"),
  role: z.enum(roles),
  profitShare: z.coerce
    .number("Isi angka persen")
    .min(0, "Tidak boleh minus")
    .max(100, "Tidak boleh lebih dari 100")
    .optional(),
};

export const createMemberSchema = z.object(memberBase);

export const updateMemberSchema = z.object({
  ...memberBase,
  memberId: z.string().min(1),
});

export const deactivateMemberSchema = z.object({
  memberId: z.string().min(1),
  restore: z.coerce.boolean().optional(),
});

export const gardenProfileSchema = z.object({
  name: z.string().trim().min(2, "Nama kebun minimal 2 karakter").max(120),
  locationName: z.string().trim().max(120).optional().or(z.literal("")),
  latitude: z.coerce
    .number("Lintang tidak valid")
    .min(-90)
    .max(90)
    .optional(),
  longitude: z.coerce
    .number("Bujur tidak valid")
    .min(-180)
    .max(180)
    .optional(),
  defaultTankLitres: z.coerce
    .number("Isi volume tangki")
    .positive("Harus lebih dari 0")
    .max(10_000),
});

export const expenseCategories = [
  "Upah",
  "Sewa",
  "Transport",
  "Operasional",
  "Benih",
  "Peralatan",
  "Lainnya",
] as const;

export const transactionTypes = ["INCOME", "EXPENSE"] as const;

const financeBase = {
  seasonId: z.string().min(1),
  type: z.enum(transactionTypes),
  category: z.enum(expenseCategories),
  amount: rupiah.refine((value) => value > 0, "Isi jumlahnya"),
  description: z.string().trim().min(2, "Tulis keterangannya").max(300),
  date: z.coerce.date("Tanggal tidak valid"),
  proofUrl: z.url("Tautan bukti tidak valid").optional().or(z.literal("")),
};

export const createFinanceEntrySchema = z.object(financeBase);

export const updateFinanceEntrySchema = z.object({
  ...financeBase,
  entryId: z.string().min(1),
});

/**
 * Menjadwalkan racikan rutin berulang di rentang HST tertentu.
 *
 * Batas 60 tugas sekali jalan bukan angka teknis: sekali klik yang membuat
 * ratusan baris adalah sekali klik yang tidak bisa dibatalkan dengan mudah.
 */
export const scheduleProgramSchema = z
  .object({
    seasonId: z.string().min(1),
    recipeId: z.string().min(1),
    fromHst: z.coerce.number("Isi HST mulai").int().min(0).max(1000),
    toHst: z.coerce.number("Isi HST selesai").int().min(0).max(1000),
    intervalDays: z.coerce
      .number("Isi jarak hari")
      .int()
      .positive("Harus lebih dari 0")
      .max(120),
    volumeL: z.coerce.number("Isi volume").positive().max(10_000),
    assigneeIds: z.array(z.string()).default([]),
  })
  .refine((value) => value.toHst >= value.fromHst, {
    message: "HST selesai harus setelah HST mulai",
    path: ["toHst"],
  })
  .refine(
    (value) =>
      Math.floor((value.toHst - value.fromHst) / value.intervalDays) + 1 <= 60,
    { message: "Kebanyakan — maksimal 60 tugas sekali jadwal", path: ["toHst"] }
  );

const contributionBase = {
  userId: z.string().min(1, "Pilih anggotanya"),
  amount: rupiah.refine((value) => value > 0, "Isi jumlahnya"),
  paidAt: z.coerce.date("Tanggal tidak valid"),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  seasonId: z.string().optional().or(z.literal("")),
  proofUrl: z.url("Tautan bukti tidak valid").optional().or(z.literal("")),
};

export const createContributionSchema = z.object(contributionBase);

export const updateContributionSchema = z.object({
  ...contributionBase,
  contributionId: z.string().min(1),
});

export const plantEventTypes = ["DIED", "REPLANTED"] as const;

const plantEventBase = {
  seasonId: z.string().min(1),
  eventDate: z.coerce.date("Tanggal tidak valid"),
  type: z.enum(plantEventTypes),
  count: z.coerce
    .number("Isi jumlah pokok")
    .int("Pokok dihitung utuh, tidak bisa setengah")
    .positive("Harus lebih dari 0")
    .max(1_000_000),
  cause: z.string().trim().max(200).optional().or(z.literal("")),
  findingId: z.string().optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  recordedById: z.string().optional().or(z.literal("")),
};

export const createPlantEventSchema = z.object(plantEventBase);

export const updatePlantEventSchema = z.object({
  ...plantEventBase,
  eventId: z.string().min(1),
});

const harvestLossBase = {
  seasonId: z.string().min(1),
  lostAt: z.coerce.date("Tanggal tidak valid"),
  grade: z.enum(chiliGrades),
  weightKg: z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().replace(",", ".") : value,
    z.coerce
      .number("Isi bobot dalam angka")
      .positive("Harus lebih dari 0")
      .max(100_000)
  ),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  recordedById: z.string().optional().or(z.literal("")),
};

export const createHarvestLossSchema = z.object(harvestLossBase);
