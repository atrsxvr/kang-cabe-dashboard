import "server-only";

import { cache } from "react";

import { resolveAccess, type AccessMatrix } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Siapa boleh menulis apa, sebagaimana berlaku sekarang: bawaan ditimpa
 * pilihan Admin. Dibaca ulang setiap permintaan — perubahan dari menu Akses
 * Peran berlaku di klik berikutnya, bukan setelah sesi seseorang habis — dan
 * di-cache dalam satu permintaan, karena setiap tombol di halaman bertanya.
 */
export const roleAccess = cache(async (): Promise<AccessMatrix> => {
  const rows = await prisma.roleAccess.findMany({
    select: { role: true, area: true, allowed: true },
  });
  return resolveAccess(rows);
});
