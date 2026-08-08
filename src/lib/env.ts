import "server-only";

import { z } from "zod";

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
});

export type Env = z.infer<typeof schema>;

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

  return result.data;
}

/**
 * Supabase's REST host is derivable from the pooler username, which carries the
 * project ref (`postgres.<ref>`). Deriving it means only the secret key has to
 * be configured by hand — one fewer value to get wrong.
 */
export function deriveSupabaseUrl(databaseUrl: string): string | undefined {
  const user = databaseUrl.match(/^[a-z+]+:\/\/([^:@/]+)/i)?.[1];
  const ref = user?.startsWith("postgres.") ? user.slice("postgres.".length) : undefined;
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
