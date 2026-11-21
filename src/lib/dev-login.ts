import { projectRefOf } from "@/lib/db-ref";
import { ROLES, type Role } from "@/lib/permissions";

/** Who `DEV_LOGIN_AS` names: one member by email, or the first with a role. */
export type DevLogin = { email: string } | { role: Role };

/**
 * Masuk otomatis saat `next dev` — siapa, atau null kalau tidak berlaku.
 *
 * Mengembangkan aplikasi berarti membukanya puluhan kali sehari, dan lewat
 * Google tiap kali cookie hilang, port pindah, atau `127.0.0.1` dipakai
 * alih-alih `localhost` (yang terakhir itu berakhir `state_mismatch`).
 *
 * Ketiga syarat ini wajib, dan semuanya diperiksa di sini supaya `proxy.ts`
 * dan `currentActor()` tidak mungkin berbeda pendapat:
 *
 * 1. **`NODE_ENV` development** — hanya `next dev`. `next build`/`next start`,
 *    Vercel (pratinjau maupun produksi), dan e2e semuanya production, jadi di
 *    sana pintu ini tidak ada sama sekali.
 * 2. **`DEV_LOGIN_AS` diisi** — email seorang anggota, atau nama peran
 *    (`ADMIN`, `AGRONOMIST`, `LOGISTICS`, `SALES`) untuk anggota aktif
 *    pertama dengan peran itu; yang kedua berguna untuk mencoba RBAC.
 * 3. **Bukan basis data produksi** (`PROD_DB_REF`). `next dev` mendengarkan di
 *    semua antarmuka, jadi dev server yang tak sengaja menunjuk data live akan
 *    membukanya sebagai Admin untuk siapa pun di Wi-Fi yang sama.
 *
 * Sesi Google yang sungguhan tetap didahulukan; ini hanya mengisi saat tidak
 * ada sesi sama sekali.
 */
export function devLogin(
  env: Record<string, string | undefined> = process.env,
): DevLogin | null {
  if (env.NODE_ENV !== "development") return null;

  const value = env.DEV_LOGIN_AS?.trim();
  if (!value) return null;

  const production = env.PROD_DB_REF?.trim();
  if (production && projectRefOf(env.DATABASE_URL) === production) return null;

  if (value.includes("@")) return { email: value.toLowerCase() };

  const role = value.toUpperCase();
  return (ROLES as readonly string[]).includes(role)
    ? { role: role as Role }
    : null;
}
