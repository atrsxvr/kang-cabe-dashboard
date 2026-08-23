import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { forbidden, unauthorized } from "next/navigation";

import { canWrite, denialMessage, type Area, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { auth } from "@/server/auth/config";
import type { ActionResult } from "@/server/actions/result";

/**
 * Lapisan akses: satu tempat yang menjawab "siapa ini, dan boleh apa".
 *
 * Dokumen Next membedakan pemeriksaan **optimistik** — membaca cookie, murah,
 * dipakai menyembunyikan tombol — dari pemeriksaan **aman**, yang membaca
 * database. Berkas ini yang kedua, dan ia satu-satunya yang boleh dipercaya
 * untuk menahan perubahan data.
 *
 * `proxy.ts` sengaja tidak memeriksa apa pun selain ada-tidaknya cookie: ia
 * berjalan di tiap permintaan termasuk prefetch, dan di produksi bisa dijalankan
 * di CDN. Ia mengalihkan yang belum masuk; ia tidak menjaga apa pun.
 */

export type Actor = {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string | null;
};

/**
 * Siapa yang sedang membuka, atau null.
 *
 * Dibungkus `cache` supaya satu render tidak menanyakan hal yang sama berkali
 * lipat: kartu, tombol, dan tabel di satu halaman semuanya perlu tahu perannya.
 *
 * **Membaca ulang dari database, bukan memercayai isi cookie.** Cookie sesi
 * berumur tujuh hari; peran yang berubah, atau anggota yang dinonaktifkan pagi
 * ini, harus berlaku sekarang — bukan setelah sesinya kedaluwarsa.
 */
export const currentActor = cache(async (): Promise<Actor | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      deletedAt: true,
    },
  });

  // Dinonaktifkan berarti tidak bisa masuk lagi, seketika. Inilah satu-satunya
  // cara mencabut akses tanpa menghapus jejak pekerjaan seseorang — dan kalau
  // pemeriksaannya cuma di halaman login, sesi yang sudah berjalan akan tetap
  // hidup sampai seminggu setelah aksesnya dicabut.
  if (!user || user.deletedAt) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
  };
});

/** Untuk halaman: wajib sudah masuk, kalau tidak lempar ke `unauthorized`. */
export async function requireActor(): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) unauthorized();
  return actor;
}

/** Untuk halaman yang seluruhnya milik satu wilayah. */
export async function requirePageWrite(area: Area): Promise<Actor> {
  const actor = await requireActor();
  if (!canWrite(actor.role, area)) forbidden();
  return actor;
}

/**
 * Untuk Server Action. Mengembalikan hasil, bukan melempar.
 *
 * Dokumen Next menegaskan Server Action harus diperlakukan seperti endpoint
 * publik — ia punya URL, dan bisa dipanggil tanpa pernah membuka halamannya.
 * Jadi tiap aksi yang mengubah data memeriksa sendiri; tidak ada satu pun yang
 * bersandar pada tombolnya disembunyikan.
 *
 * Mengembalikan `ActionResult` supaya penolakannya sampai ke pemakainya sebagai
 * pesan yang menyebut siapa yang mengurus bagian itu, bukan sebagai halaman
 * error yang membuang apa yang sudah diketik.
 */
export type Allowed = { ok: true; actor: Actor };

export async function guardWrite(
  area: Area
): Promise<Allowed | (ActionResult & { ok: false })> {
  const actor = await currentActor();

  if (!actor) {
    return { ok: false, message: "Sesi kamu sudah habis. Masuk lagi dulu ya." };
  }

  if (!canWrite(actor.role, area)) {
    return { ok: false, message: denialMessage(area) };
  }

  return { ok: true, actor };
}
