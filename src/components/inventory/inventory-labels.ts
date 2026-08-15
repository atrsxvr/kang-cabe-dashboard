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

export const toolEventLabels: Record<string, string> = {
  ACQUIRED: "Beli / dapat baru",
  LOST: "Hilang",
  RETIRED: "Dipensiunkan",
  DAMAGED: "Rusak / butuh servis",
  SERVICED: "Selesai diservis",
  CHECKED_OUT: "Dibawa keluar",
  RETURNED: "Dikembalikan",
};

export const serviceStatusLabels: Record<string, string> = {
  OK: "Terjadwal",
  DUE_SOON: "Servis sebentar lagi",
  OVERDUE: "Servis lewat jadwal",
};

export const serviceStatusTones: Record<string, string> = {
  OK: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  DUE_SOON: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  OVERDUE: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
};
