/**
 * Kas: uang yang benar-benar ada sekarang.
 *
 * **Dihitung, tidak pernah disimpan.** Tidak ada kolom saldo di mana pun, dan
 * itu aturan yang sama dengan stok dan populasi: angka yang disimpan di samping
 * sumbernya adalah angka yang suatu hari berhenti diperbarui. Setiap rupiah di
 * sini berasal dari catatan yang sudah dibuat di tempat lain.
 *
 * Yang **sengaja tidak** masuk:
 *
 * - Pemakaian bahan di tugas. Uangnya keluar waktu belanja; menghitungnya lagi
 *   saat dipakai membuat satu karung pupuk mengurangi kas dua kali.
 * - Stok awal saat bahan didaftarkan. Dicatat sebagai koreksi, bukan belanja —
 *   pupuk sisa musim sebelum aplikasi dipakai dibayar dengan uang yang juga
 *   tidak pernah tercatat masuk.
 * - Penjualan yang belum lunas. Itu piutang, bukan uang di tangan.
 */

export const CASH_SOURCES = [
  "CAPITAL",
  "SALE",
  "OTHER_INCOME",
  "PURCHASE",
  "TOOL",
  "EXPENSE",
  "PROFIT_SHARE",
  "CAPITAL_RETURN",
] as const;

export type CashSource = (typeof CASH_SOURCES)[number];

export type CashDirection = "IN" | "OUT";

const DIRECTION: Record<CashSource, CashDirection> = {
  CAPITAL: "IN",
  SALE: "IN",
  OTHER_INCOME: "IN",
  PURCHASE: "OUT",
  TOOL: "OUT",
  EXPENSE: "OUT",
  PROFIT_SHARE: "OUT",
  CAPITAL_RETURN: "OUT",
};

export const cashSourceLabels: Record<CashSource, string> = {
  CAPITAL: "Setoran modal",
  SALE: "Penjualan lunas",
  OTHER_INCOME: "Pemasukan lain",
  PURCHASE: "Belanja bahan",
  TOOL: "Beli & servis alat",
  EXPENSE: "Pengeluaran",
  PROFIT_SHARE: "Bagi hasil",
  CAPITAL_RETURN: "Tarik modal",
};

export function directionOf(source: CashSource): CashDirection {
  return DIRECTION[source];
}

/** Satu uang masuk atau keluar. `amount` selalu positif; arahnya dari sumber. */
export type CashEntry = {
  id: string;
  date: Date;
  source: CashSource;
  amount: number;
  label: string;
  detail: string | null;
};

export type LedgerRow = CashEntry & {
  direction: CashDirection;
  /** Saldo tepat sesudah baris ini — buat menelusuri di mana angkanya meleset. */
  balanceAfter: number;
};

export type CashTotals = {
  balance: number;
  totalIn: number;
  totalOut: number;
  bySource: Record<CashSource, number>;
  /** Terbaru di atas. */
  ledger: LedgerRow[];
};

export function summariseCash(entries: CashEntry[]): CashTotals {
  const bySource = Object.fromEntries(
    CASH_SOURCES.map((source) => [source, 0])
  ) as Record<CashSource, number>;

  // Urut dari yang paling lama supaya saldo berjalan bisa dihitung. Pada
  // tanggal yang sama uang masuk didahulukan: setoran dan belanja di hari yang
  // sama hampir selalu berarti setorannya yang membiayai belanja itu, dan
  // urutan sebaliknya memperlihatkan saldo minus yang tidak pernah terjadi.
  const ordered = [...entries].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      (directionOf(a.source) === directionOf(b.source)
        ? 0
        : directionOf(a.source) === "IN"
          ? -1
          : 1) ||
      a.id.localeCompare(b.id)
  );

  let balance = 0;
  let totalIn = 0;
  let totalOut = 0;
  const ledger: LedgerRow[] = [];

  for (const entry of ordered) {
    const direction = directionOf(entry.source);
    bySource[entry.source] += entry.amount;

    if (direction === "IN") {
      totalIn += entry.amount;
      balance += entry.amount;
    } else {
      totalOut += entry.amount;
      balance -= entry.amount;
    }

    ledger.push({ ...entry, direction, balanceAfter: balance });
  }

  return { balance, totalIn, totalOut, bySource, ledger: ledger.reverse() };
}

/**
 * Modal bersih seseorang: yang disetor dikurangi yang ditarik kembali.
 *
 * Bagi hasil sengaja tidak ikut. Ia membayar bagian laba, bukan mengembalikan
 * setoran — memotongnya dari modal akan membuat orang yang menerima bagiannya
 * terlihat seolah ikut menarik uangnya dari kebun.
 */
export function netCapital(contributed: number, returned: number): number {
  return contributed - returned;
}
