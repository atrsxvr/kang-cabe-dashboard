/**
 * Menyaring tujuan pengalihan sesudah masuk.
 *
 * `?lanjut=` ada supaya tautan yang dibagikan di grup WA tetap sampai ke halaman
 * yang dituju setelah orangnya login. Nilainya datang dari URL, jadi ia masukan
 * dari luar — dan dipakai apa adanya, ia **open redirect**:
 *
 *     /masuk?lanjut=https://kangcabe-login.contoh-jahat.com
 *
 * Yang membuka tautan itu melihat domain kebun yang sah, lalu dilempar ke
 * halaman login tiruan. Domain pengirimnya yang asli itulah yang membuatnya
 * meyakinkan — dan tiga dari empat pemakai aplikasi ini bukan orang teknis.
 *
 * Disaring dengan **mengurai**, bukan dengan mencocokkan awalan. Tiga bentuk
 * yang semuanya terbukti lolos dari pemeriksaan `startsWith("/")`:
 *
 * - `https://jahat.com` — mutlak
 * - `//jahat.com` — relatif-protokol
 * - `/\jahat.com` — peramban dan pengurai WHATWG membaca `\` sebagai `/`
 *
 * Menguraikannya terhadap origin boneka menangkap ketiganya sekaligus, beserta
 * bentuk terkode yang belum terpikirkan.
 */

const DUMMY_ORIGIN = "http://localhost";

export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value === "") return fallback;

  // Jalur di aplikasi ini selalu dimulai dengan satu garis miring. Menolak yang
  // lain lebih dulu membuat sisanya lebih mudah dibaca.
  if (!value.startsWith("/")) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, DUMMY_ORIGIN);
  } catch {
    return fallback;
  }

  // Begitu origin-nya bergeser, tujuannya bukan aplikasi ini lagi.
  if (parsed.origin !== DUMMY_ORIGIN) return fallback;

  return `${parsed.pathname}${parsed.search}`;
}
