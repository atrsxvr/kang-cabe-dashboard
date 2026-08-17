import { NextResponse, type NextRequest } from "next/server";

/**
 * Pengalihan awal buat yang belum masuk.
 *
 * **Bukan `middleware.ts`** — konvensi itu sudah deprecated di Next.js 16 dan
 * berganti nama menjadi `proxy.ts`. Semua kemampuannya sama; cuma nama berkas
 * dan nama ekspornya yang berubah.
 *
 * Sengaja **cuma memeriksa ada-tidaknya cookie sesi**, tanpa menyentuh database
 * dan tanpa membuka isinya. Dua alasan, keduanya dari dokumen Next: berkas ini
 * berjalan di setiap permintaan termasuk prefetch, dan pada penempatan tertentu
 * dijalankan di CDN — jauh dari basis data mana pun.
 *
 * Jadi ini **bukan** penjagaan. Cookie palsu akan melewatinya. Yang benar-benar
 * menahan perubahan data ada di `server/auth/guard.ts`, yang membaca database,
 * dan di tiap Server Action yang memanggilnya. Kalau berkas ini dihapus,
 * aplikasinya tetap aman — cuma jadi tidak enak dipakai.
 */
const PUBLIC = ["/masuk", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Nama cookie better-auth. Prefix `__Secure-` dipakainya di HTTPS.
  const signedIn =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");

  if (signedIn) return NextResponse.next();

  const login = new URL("/masuk", request.url);
  // Supaya sesudah masuk orangnya kembali ke halaman yang ia tuju, bukan ke
  // dashboard — tautan yang dibagikan di grup WA harus tetap berfungsi.
  if (pathname !== "/") login.searchParams.set("lanjut", pathname);

  return NextResponse.redirect(login);
}

export const config = {
  // Aset statis dan berkas Next tidak perlu diperiksa.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
