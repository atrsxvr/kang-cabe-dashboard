/**
 * Pinjaman anggota dari kas: yang dipinjam dikurangi yang sudah kembali.
 *
 * Dihitung, tidak disimpan — sama seperti saldo kas dan stok. Tanpa bunga,
 * sebagaimana disepakati pemilik kebun.
 */

export type LoanEntry = {
  userId: string;
  type: "LENT" | "REPAID";
  amount: number;
};

/** Sisa pinjaman tiap anggota yang masih punya utang ke kas. */
export function outstandingByMember(entries: LoanEntry[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const entry of entries) {
    const signed = entry.type === "LENT" ? entry.amount : -entry.amount;
    balances.set(entry.userId, (balances.get(entry.userId) ?? 0) + signed);
  }
  for (const [userId, balance] of balances) {
    if (balance <= 0) balances.delete(userId);
  }
  return balances;
}

/**
 * Berapa yang dipotong dari bagi hasil untuk melunasi pinjaman.
 *
 * Paling banyak sebesar sisa pinjamannya, dan tidak pernah melebihi jatahnya:
 * bagi hasil Rp 1 juta dengan pinjaman Rp 300 ribu berarti Rp 300 ribu
 * dipotong dan Rp 700 ribu diserahkan; dengan pinjaman Rp 2 juta, seluruh
 * jatahnya dipotong dan sisanya masih dipinjam.
 */
export function loanOffset(outstanding: number, payout: number): number {
  return Math.max(0, Math.min(outstanding, payout));
}
