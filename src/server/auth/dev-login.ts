import "server-only";

import { devLogin } from "@/lib/dev-login";
import { prisma } from "@/lib/prisma";

/** Said once per dev server, not on every render. */
let announced = false;
const announce = (message: string) => {
  if (announced) return;
  announced = true;
  console.info(message);
};

/**
 * The member `DEV_LOGIN_AS` names, when it applies (see `devLogin`), or null.
 *
 * Only an id: `currentActor()` then reads the member the same way it reads one
 * from a real session — role, access, deactivation and all — so nothing about
 * what a member may do is decided here.
 */
export async function devLoginUserId(): Promise<string | null> {
  const target = devLogin();

  if (!target) {
    if (process.env.NODE_ENV === "development" && process.env.DEV_LOGIN_AS?.trim()) {
      announce(
        `[dev] DEV_LOGIN_AS="${process.env.DEV_LOGIN_AS.trim()}" diabaikan: bukan email atau peran yang dikenal, ` +
          "atau DATABASE_URL menunjuk basis data produksi (PROD_DB_REF). Tetap diminta masuk lewat Google.",
      );
    }
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      ...("email" in target
        ? { email: { equals: target.email, mode: "insensitive" as const } }
        : { role: target.role }),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true },
  });

  announce(
    user
      ? `[dev] Masuk otomatis sebagai ${user.email} (${user.role}) — DEV_LOGIN_AS di .env. Hapus barisnya untuk login biasa.`
      : `[dev] DEV_LOGIN_AS tidak cocok dengan anggota aktif mana pun. Tetap diminta masuk lewat Google.`,
  );

  return user?.id ?? null;
}
