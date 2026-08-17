/**
 * Siapa boleh mengubah apa.
 *
 * Satu berkas, tanpa database dan tanpa Next.js, supaya seluruh aturannya bisa
 * dibaca sekali duduk dan diuji tanpa menjalankan apa pun. Yang menegakkannya
 * ada di `src/server/auth/guard.ts`; yang **memutuskan** cuma di sini.
 *
 * **Membaca tidak diatur di sini, dan itu sengaja.** Empat orang ini satu
 * koperasi: menyembunyikan angka dari rekan sendiri menghilangkan guna aplikasi
 * ini dibangun, dan aturan "porsi bagi hasil tidak dinormalkan" cuma berarti
 * kalau semua bisa melihat celahnya. Jadi sudah masuk berarti boleh membaca
 * semuanya — otorisasi di sini semata soal menulis.
 */

export const ROLES = ["ADMIN", "AGRONOMIST", "LOGISTICS", "SALES"] as const;

export type Role = (typeof ROLES)[number];

export const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  AGRONOMIST: "Agronomis",
  LOGISTICS: "Logistik",
  SALES: "Panen & Penjualan",
};

/**
 * Wilayah kerja, bukan halaman.
 *
 * Dipisah per wilayah dan bukan per menu karena satu halaman bisa memuat dua
 * wilayah yang berbeda pemiliknya — halaman Kesehatan menampung laporan temuan
 * yang siapa pun boleh tulis dan diagnosa yang cuma Agronomis, dan memberi
 * keduanya satu izin akan salah ke salah satu arah.
 */
export const AREAS = [
  "seasons",
  "tasks",
  /** Melaporkan apa yang dilihat di kebun. */
  "findings",
  /** Menegakkan diagnosa dan perlakuan atas temuan. */
  "diagnosis",
  "recipes",
  /**
   * Mendaftarkan sebuah bahan: nama, satuan, kategori.
   *
   * Wilayah tersendiri karena satu dialog yang sama dibuka dari dua halaman
   * milik dua orang berbeda. Agronomis yang menyusun racikan perlu mendaftarkan
   * bahan yang belum ada; Logistik yang mengurus gudang juga. Mengunci ini ke
   * salah satunya akan memblokir yang lain di tengah formulir.
   *
   * Terpisah dari `inventory`, yang mengurus stok dan harganya — mendaftarkan
   * "NPK 16-16-16" dan memutuskan berapa karung yang ada di rak adalah dua
   * pekerjaan berbeda yang kebetulan menyentuh satu tabel.
   */
  "materials",
  /** Populasi tanaman: mati dan sulam. */
  "population",
  /** Stok, harga, opname, alat, dan daftar belanja. */
  "inventory",
  /** Panen, penjualan, dan penagihan. */
  "harvest",
  /**
   * Susut: cabai yang sudah dipetik lalu busuk atau tercecer.
   *
   * Wilayah tersendiri, terpisah dari `harvest`, karena **siapa pun boleh
   * mencatatnya**. Yang menemukan tumpukan membusuk bisa Agronomis yang lewat
   * atau Logistik yang menata gudang, bukan cuma yang mengurus penjualan — dan
   * susut yang tidak tercatat membuat sisa stok terus melar sampai angkanya jauh
   * dari tumpukan yang benar-benar ada.
   *
   * Mencatat kehilangan juga tidak bisa dipakai menguntungkan diri sendiri,
   * jadi membukanya lebar tidak menambah risiko apa pun.
   */
  "losses",
  "finance",
  /** Setoran modal tiap anggota. */
  "capital",
  "settings",
] as const;

export type Area = (typeof AREAS)[number];

/**
 * Peran yang boleh menulis di tiap wilayah.
 *
 * Mengikuti pembagian kerja yang sudah disepakati empat orang ini, jadi tidak
 * ada aturan baru yang perlu dihafal siapa pun: yang mengurus gudang menulis di
 * gudang, yang mengurus panen menulis di panen.
 *
 * `ADMIN` ada di **setiap** baris, dan itu permintaan yang disampaikan
 * terang-terangan: ia perlu bisa menutupi pekerjaan yang tertinggal saat
 * temannya tidak bisa mengisi sendiri. Ada tes yang menjaga itu tetap benar
 * untuk wilayah yang ditambahkan nanti.
 */
const WRITERS: Record<Area, readonly Role[]> = {
  // Membuat dan menutup musim menentukan konteks seluruh aplikasi; salah pilih
  // di sini memindahkan tempat semua orang lain menulis.
  seasons: ["ADMIN"],
  // Admin sendirian. Menyusun jadwal adalah membagi pekerjaan orang lain, dan
  // itu keputusan satu orang setelah berunding — bukan sesuatu yang diubah
  // masing-masing sendiri di lapangan.
  tasks: ["ADMIN"],
  // Siapa pun yang keliling kebun. Menutup ini berarti temuan yang dilihat
  // Logistik tidak pernah sampai ke Agronomis.
  findings: ["ADMIN", "AGRONOMIST", "LOGISTICS", "SALES"],
  diagnosis: ["ADMIN", "AGRONOMIST"],
  recipes: ["ADMIN", "AGRONOMIST"],
  // Keduanya, dan itu bukan kelonggaran: dialognya satu, halamannya dua.
  materials: ["ADMIN", "AGRONOMIST", "LOGISTICS"],
  population: ["ADMIN", "AGRONOMIST"],
  inventory: ["ADMIN", "LOGISTICS"],
  harvest: ["ADMIN", "SALES"],
  // Semuanya. Yang menemukan cabai membusuk bukan selalu yang menjualnya.
  losses: ["ADMIN", "AGRONOMIST", "LOGISTICS", "SALES"],
  finance: ["ADMIN"],
  capital: ["ADMIN"],
  settings: ["ADMIN"],
};

export function canWrite(role: Role, area: Area): boolean {
  return WRITERS[area].includes(role);
}

/** Wilayah yang bisa ditulis sebuah peran — buat menyembunyikan tombol. */
export function writableAreas(role: Role): Area[] {
  return AREAS.filter((area) => canWrite(role, area));
}

/**
 * Kalimat penolakan yang menyebut siapa yang seharusnya mengerjakannya.
 *
 * "Kamu tidak punya akses" membuat orang berhenti dan bertanya-tanya. Menyebut
 * perannya mengubah jalan buntu jadi arahan: yang membaca tahu harus minta ke
 * siapa, tanpa perlu menebak siapa yang punya tombolnya.
 */
export function denialMessage(area: Area): string {
  const allowed = WRITERS[area]
    .filter((role) => role !== "ADMIN")
    .map((role) => roleLabels[role]);

  if (allowed.length === 0) {
    return "Cuma Admin yang bisa mengubah bagian ini.";
  }

  return `Bagian ini diurus ${allowed.join(" atau ")}. Minta tolong mereka, atau Admin.`;
}
