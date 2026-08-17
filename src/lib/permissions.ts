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
  /** Populasi tanaman: mati dan sulam. */
  "population",
  "inventory",
  /** Panen, susut, penjualan, dan penagihan. */
  "harvest",
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
  tasks: ["ADMIN", "AGRONOMIST"],
  // Siapa pun yang keliling kebun. Menutup ini berarti temuan yang dilihat
  // Logistik tidak pernah sampai ke Agronomis.
  findings: ["ADMIN", "AGRONOMIST", "LOGISTICS", "SALES"],
  diagnosis: ["ADMIN", "AGRONOMIST"],
  recipes: ["ADMIN", "AGRONOMIST"],
  population: ["ADMIN", "AGRONOMIST"],
  inventory: ["ADMIN", "LOGISTICS"],
  harvest: ["ADMIN", "SALES"],
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
