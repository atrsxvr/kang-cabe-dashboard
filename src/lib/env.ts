import "server-only";

import { z } from "zod";

import { projectRefOf } from "@/lib/db-ref";

/**
 * Validated server environment. Importing this module fails loudly at boot
 * with the offending variable named, instead of surfacing later as an opaque
 * connection error deep in a request.
 */
/**
 * Provider docs write the password as `[YOUR-PASSWORD]`, and it is easy to
 * paste the brackets along with it. The WHATWG URL parser percent-encodes them
 * instead of failing, so `z.url()` alone lets it through and the only symptom
 * is an authentication error. Catch it by name here.
 *
 * Only the userinfo is inspected — brackets are legal around an IPv6 host.
 */
const noPlaceholderBrackets = (value: string) => {
  const userinfo = value.match(/^[a-z+]+:\/\/([^@/]*)@/i)?.[1];
  return userinfo === undefined || !/[[\]]/.test(userinfo);
};

const connectionString = z
  .url({ protocol: /^postgres(ql)?$/ })
  .refine(noPlaceholderBrackets, {
    message:
      "password still wrapped in [brackets] — paste the value without them",
  });

const schema = z.object({
  // Runtime pool. Supabase's transaction pooler (port 6543) in production.
  DATABASE_URL: connectionString,
  // Session pooler (port 5432) for prisma migrate / studio, which need DDL.
  // Optional: setups without a pooler use DATABASE_URL for both.
  DIRECT_URL: connectionString.optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Photo upload. Optional on purpose: the rest of the app runs without it,
  // and the finding form degrades to text-only rather than failing to render.
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  /**
   * Login lewat Google. **Wajib di produksi**, boleh kosong saat pengembangan.
   *
   * Bukan kelonggaran: `requireAuthInProduction` di bawah menolak boot kalau
   * salah satunya hilang di produksi, karena aplikasi yang menyala tanpa
   * otentikasi adalah aplikasi yang seluruh endpoint tulisnya terbuka — dan
   * kegagalan itu tidak bersuara.
   *
   * Di localhost dibiarkan opsional karena gagal keras di situ tidak melindungi
   * siapa pun, dan menukar halaman yang bisa dibaca dengan tumpukan galat
   * membuat orang yang sedang memasang kredensialnya kehilangan tempat berpijak.
   * Yang belum dikonfigurasi tetap tidak bisa masuk; ia cuma diberi tahu
   * sebabnya alih-alih dilempar 500.
   */
  GOOGLE_CLIENT_ID: z.string().min(10).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(10).optional(),
  /** Kunci penanda tangan cookie sesi. Bikin dengan `openssl rand -base64 32`. */
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  /**
   * Asal aplikasi, dipakai menyusun URL callback OAuth. Harus sama persis
   * dengan yang didaftarkan di Google Cloud Console — beda satu garis miring
   * pun ditolak Google, dengan pesan yang tidak menyebut sebabnya.
   */
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof schema>;

/**
 * Ketiganya wajib di produksi, dan penolakannya di sini — bukan di schema.
 *
 * Dipisah supaya localhost tetap bisa menyala sambil kredensialnya disiapkan,
 * tanpa memberi produksi jalan yang sama. Yang dilindungi bukan berkas `.env`,
 * tapi kenyataan bahwa satu deploy yang lupa mengisinya akan membuka seluruh
 * endpoint tulis ke internet tanpa satu pun tanda.
 */
function requireAuthInProduction(env: Env): string[] {
  if (env.NODE_ENV !== "production") return [];

  const missing = (
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "BETTER_AUTH_SECRET"] as const
  )
    .filter((key) => !env[key])
    .map((key) => `  ${key}: wajib di produksi — tanpanya login mati total`);

  return missing;
}

/** localhost boleh polos — di situ tidak ada jaringan untuk disadap. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

/**
 * `http://` ke host selain localhost selalu salah, kapan pun.
 *
 * better-auth memutuskan flag `Secure` pada cookie sesi dari apakah baseURL
 * dimulai `https://`. Diisi `http://domain-sungguhan`, cookie sesi dikirim
 * polos — tanpa galat, tanpa peringatan, aplikasinya jalan normal, dan siapa pun
 * di jaringan yang sama bisa membaca lalu memakai sesinya.
 *
 * Diperiksa dari **host-nya**, bukan dari `NODE_ENV`. Versi pertama memakai
 * `NODE_ENV === "production"` dan itu keliru: `next build` menyetelnya pada
 * setiap build, termasuk build lokal dan CI yang memang tidak punya domain
 * sungguhan. Penjaganya lalu menolak boot pada perintah yang paling sering
 * dijalankan. Host adalah sinyal yang benar-benar menandakan bahayanya.
 */
function requireSecureOrigin(env: Env): string[] {
  let host: string;
  try {
    host = new URL(env.BETTER_AUTH_URL).hostname;
  } catch {
    return [];
  }

  if (env.BETTER_AUTH_URL.startsWith("https://") || LOCAL_HOSTS.has(host)) {
    return [];
  }

  return [
    `  BETTER_AUTH_URL: ${host} bukan localhost, jadi wajib https — cookie sesi kehilangan flag Secure kalau tidak`,
  ];
}

/** Cukup lengkap untuk benar-benar bisa dipakai masuk. */
export function isAuthConfigured(env: Env): boolean {
  return Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.BETTER_AUTH_SECRET
  );
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Environment variables are invalid:\n${details}\n\n` +
        `Copy .env.example to .env and fill in the values.`
    );
  }

  const missing = [
    ...requireAuthInProduction(result.data),
    ...requireSecureOrigin(result.data),
  ];

  if (missing.length > 0) {
    throw new Error(
      `Environment variables are invalid:\n${missing.join("\n")}\n\n` +
        `Copy .env.example to .env and fill in the values.`
    );
  }

  return result.data;
}

/**
 * Supabase's REST host is derivable from the pooler username, which carries the
 * project ref (`postgres.<ref>`). Deriving it means only the secret key has to
 * be configured by hand — one fewer value to get wrong.
 */
export function deriveSupabaseUrl(databaseUrl: string): string | undefined {
  const ref = projectRefOf(databaseUrl);
  return ref ? `https://${ref}.supabase.co` : undefined;
}

let cached: Env | undefined;

/**
 * Memoised so validation runs once. Deliberately not evaluated at module load:
 * that would make importing this file for its types or `parseEnv` blow up in
 * tests and tooling that legitimately have no database configured.
 */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
