export const stockStatusLabels: Record<string, string> = {
  SAFE: "Aman",
  LOW: "Menipis",
  OUT_OF_STOCK: "Habis",
};

// Colour never carries the meaning alone — each pairs with its text label.
export const stockStatusTones: Record<string, string> = {
  SAFE: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  LOW: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  OUT_OF_STOCK: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
};

export const materialCategoryLabels: Record<string, string> = {
  FERTILIZER: "Pupuk",
  PESTICIDE: "Pestisida",
  FUNGICIDE: "Fungisida",
  GROWTH_REGULATOR: "ZPT",
  SEED: "Benih",
  MULCH: "Mulsa",
  SUPPLIES: "Perlengkapan",
  OTHER: "Lainnya",
};

export const stockReasonLabels: Record<string, string> = {
  PURCHASE: "Belanja",
  USAGE: "Pemakaian",
  CORRECTION: "Koreksi",
  LOSS: "Rusak / hilang",
};

export const toolConditionLabels: Record<string, string> = {
  GOOD: "Baik",
  NEEDS_SERVICE: "Butuh servis",
  BROKEN: "Rusak",
};

export const toolConditionTones: Record<string, string> = {
  GOOD: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  NEEDS_SERVICE: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  BROKEN: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
};

export const UNIT_OPTIONS = [
  "gram",
  "ml",
  "kg",
  "liter",
  "pcs",
  "roll",
  "sak",
  "meter",
];
