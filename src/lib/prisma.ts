import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { getEnv } from "@/lib/env";
import { PrismaClient } from "@/generated/prisma/client";

// Evaluated when this module is first imported, so a misconfigured environment
// fails immediately with a named variable rather than a connection error later.
const env = getEnv();

// `next dev` reloads modules on every change, which would otherwise open a new
// connection pool each time. Reuse a single client across reloads.
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
