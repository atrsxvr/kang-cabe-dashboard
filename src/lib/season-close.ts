/**
 * What has to be settled before a season's numbers are final.
 *
 * Closing a season is the moment its margin gets split among four people,
 * and the margin is only as true as what was recorded. Each check here is a
 * way it can quietly be wrong — a cost counted as zero, money counted before
 * it arrived, a share nobody owns — found more than once in this garden's own
 * records before this list existed.
 *
 * Every one of them blocks closing. The garden's owner decided it: a season
 * closes only once the team has settled all of it — chillies nobody will buy
 * are recorded as susut, a payment that is never coming is chased or written
 * off — so the report that gets signed is the final word, not a draft.
 */

export type ClosingFacts = {
  /** Tasks marked done whose materials were never deducted. */
  unrecordedUsageTasks: number;
  /** Usage recorded while its material had no price; counted as Rp 0. */
  unpricedUsages: number;
  /** Purchases anywhere in the shed still waiting for a price. */
  unpricedPurchases: number;
  /** Sales not yet paid: count and rupiah. */
  unpaidSales: number;
  unpaidAmount: number;
  /** Bagus still unsold, and what it is worth at cost. */
  unsoldKg: number;
  unsoldValue: number;
  /** Net capital in the pot — what the margin is split by. */
  capitalTotal: number;
};

export type ClosingCheck = {
  key: string;
  ok: boolean;
  title: string;
  /** What it means for the numbers, when it is not ok. */
  detail: string;
  /** Where to go to settle it. */
  href: string;
  linkLabel: string;
};

/** Below this, unsold Bagus is a rounding artefact, not a heap. */
const UNSOLD_NOISE_KG = 0.1;

export function closingChecklist(
  facts: ClosingFacts,
  seasonId: string,
  format: { rupiah: (value: number) => string; kg: (value: number) => string }
): ClosingCheck[] {
  const season = `?season=${encodeURIComponent(seasonId)}`;

  return [
    {
      key: "usage",
      ok: facts.unrecordedUsageTasks === 0,
      title:
        facts.unrecordedUsageTasks === 0
          ? "Semua pemakaian bahan sudah dicatat"
          : `${facts.unrecordedUsageTasks} tugas selesai, pemakaian bahannya belum dicatat`,
      detail:
        "Bahannya belum dikurangi dari gudang dan biayanya belum masuk musim ini — biaya musim jadi kekecilan.",
      href: `/tasks${season}`,
      linkLabel: "Ke Jadwal & Tugas",
    },
    {
      key: "unpriced-usage",
      ok: facts.unpricedUsages === 0,
      title:
        facts.unpricedUsages === 0
          ? "Semua pemakaian bahan ada harganya"
          : `${facts.unpricedUsages} pemakaian bahan tercatat tanpa harga`,
      detail:
        "Terhitung Rp 0 di biaya musim. Isi harga belanjanya di Inventaris lewat Riwayat.",
      href: "/inventory",
      linkLabel: "Ke Inventaris",
    },
    {
      key: "unpriced-purchase",
      ok: facts.unpricedPurchases === 0,
      title:
        facts.unpricedPurchases === 0
          ? "Semua belanja di gudang ada harganya"
          : `${facts.unpricedPurchases} belanja di gudang belum ada harganya`,
      detail:
        "Kalau bahannya terpakai musim ini, harga rata-ratanya kemurahan dan biayanya ikut kecil.",
      href: "/inventory",
      linkLabel: "Ke Inventaris",
    },
    {
      key: "unpaid",
      ok: facts.unpaidSales === 0,
      title:
        facts.unpaidSales === 0
          ? "Semua penjualan sudah lunas"
          : `${facts.unpaidSales} penjualan belum lunas (${format.rupiah(facts.unpaidAmount)})`,
      detail:
        "Sudah dihitung sebagai pemasukan, jadi ikut dibagi — padahal uangnya belum ada di tangan.",
      href: `/harvest${season}`,
      linkLabel: "Ke Panen & Penjualan",
    },
    {
      key: "unsold",
      ok: facts.unsoldKg <= UNSOLD_NOISE_KG,
      title:
        facts.unsoldKg <= UNSOLD_NOISE_KG
          ? "Semua cabai Bagus sudah terjual"
          : `${format.kg(facts.unsoldKg)} cabai Bagus belum terjual`,
      detail: `Senilai ${format.rupiah(facts.unsoldValue)} pada harga pokok. Tidak masuk sisa musim, jadi tidak ikut dibagi. Kalau memang tidak akan laku, catat sebagai susut.`,
      href: `/harvest${season}`,
      linkLabel: "Ke Panen & Penjualan",
    },
    {
      key: "capital",
      ok: facts.capitalTotal > 0,
      title:
        facts.capitalTotal > 0
          ? "Ada modal yang disetor untuk membagi hasil"
          : "Belum ada modal yang disetor",
      detail:
        "Bagi hasil dihitung dari modal bersih tiap anggota. Tanpa setoran tercatat, sisa musim tidak bisa dibagi ke siapa pun. Catat di Keuangan → Modal.",
      href: `/finance${season}`,
      linkLabel: "Ke Keuangan",
    },
  ];
}

/** A season can close only when every check is settled. */
export function canCloseSeason(checks: ClosingCheck[]): boolean {
  return checks.every((check) => check.ok);
}
