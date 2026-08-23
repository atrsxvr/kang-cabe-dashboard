import { createSessionCookie, disconnectSessions } from "./session";

/**
 * Membuat sesi dan mencetak cookie-nya sebagai JSON ke stdout.
 *
 * Berdiri sebagai proses sendiri karena loader Playwright tersedak klien Prisma
 * yang ESM — masalah yang sama dengan yang sudah dipecahkan teardown, dan
 * dipecahkan dengan cara yang sama: `tsx`, satu tingkat terpisah.
 */
const role = (process.argv[2] ?? "ADMIN") as
  | "ADMIN"
  | "AGRONOMIST"
  | "LOGISTICS"
  | "SALES";

async function main() {
  const cookie = await createSessionCookie(role);
  await disconnectSessions();

  process.stdout.write(JSON.stringify(cookie));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
