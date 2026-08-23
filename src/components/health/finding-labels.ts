export const findingStatusLabels: Record<string, string> = {
  REPORTED: "Perlu diagnosa",
  DIAGNOSED: "Menunggu penanganan",
  TREATED: "Sudah ditangani",
  RESOLVED: "Selesai",
};

export const severityLabels: Record<string, string> = {
  LOW: "Ringan",
  MEDIUM: "Sedang",
  HIGH: "Berat",
};

// Colour never carries the meaning alone — each pairs with its text label.
export const findingStatusTones: Record<string, string> = {
  REPORTED: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
  DIAGNOSED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  TREATED: "bg-blue-500/12 text-blue-700 dark:text-blue-400",
  RESOLVED: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
};

export const severityTones: Record<string, string> = {
  LOW: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  HIGH: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
};
