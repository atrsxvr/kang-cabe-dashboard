import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Sesi masuk untuk rangkaian e2e.
 *
 * Sejak otentikasi terpasang, setiap halaman mengalihkan yang belum masuk ke
 * `/masuk` — dan seluruh suite ini membuka halaman. Jadi ia butuh sesi.
 *
 * **Ditulis langsung ke basis data, bukan lewat menekan tombol Google.** Alur
 * OAuth melibatkan layar milik Google yang tidak boleh dan tidak bisa
 * diotomatiskan; mencobanya akan menjadikan suite ini bergantung pada layanan
 * pihak ketiga dan pada satu akun sungguhan.
 *
 * Yang **tidak** dilewati: cookie-nya ditandatangani dengan rahasia yang sama,
 * dan barisnya sungguhan di tabel `Session`. Jadi yang diuji tetap penjagaan
 * yang asli — `currentActor()` membaca baris itu, memeriksa `deletedAt`, dan
 * membaca perannya dari database. Tidak ada jalan pintas yang melewati
 * penjaganya; yang dilewati cuma layar login Google.
 */

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) throw new Error("DIRECT_URL / DATABASE_URL belum diisi.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Awalan yang membuat sesi buatan tes bisa dibersihkan lagi. */
export const E2E_TOKEN_PREFIX = "E2E-session-";

export const SESSION_COOKIE = "better-auth.session_token";

/**
 * Tanda tangan cookie, sama persis dengan yang dipakai better-call:
 * `encodeURIComponent(token + "." + btoa(HMAC-SHA256(token, secret)))`.
 *
 * Ditulis ulang di sini alih-alih diimpor karena `signCookieValue` bukan API
 * publik pustakanya. Kalau formatnya berubah, tes login di bawah yang akan
 * gagal lebih dulu — bukan seluruh suite dengan pesan yang membingungkan.
 */
async function signCookie(token: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(token)
  );

  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return encodeURIComponent(`${token}.${base64}`);
}

export type SignedSession = { name: string; value: string };

/**
 * Membuat sesi untuk anggota dengan peran tertentu, dan mengembalikan cookie-nya.
 *
 * Perannya jadi parameter supaya nanti bisa dipakai memeriksa penolakan: yang
 * paling perlu diuji dari RBAC bukan bahwa Admin bisa, tapi bahwa yang lain
 * tidak bisa.
 */
export async function createSessionCookie(
  role: "ADMIN" | "AGRONOMIST" | "LOGISTICS" | "SALES" = "ADMIN"
): Promise<SignedSession> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET belum diisi.");

  const user = await prisma.user.findFirst({
    where: { role, deletedAt: null },
    select: { id: true },
  });

  if (!user) throw new Error(`Tidak ada anggota aktif berperan ${role}.`);

  const token = `${E2E_TOKEN_PREFIX}${role}-${Date.now()}`;

  await prisma.session.create({
    data: {
      id: token,
      token,
      userId: user.id,
      // Cukup lama untuk seluruh suite, cukup pendek untuk tidak jadi kunci
      // yang tertinggal kalau pembersihannya gagal.
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return { name: SESSION_COOKIE, value: await signCookie(token, secret) };
}

export async function disconnectSessions() {
  await prisma.$disconnect();
}
