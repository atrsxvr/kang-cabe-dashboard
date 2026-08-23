import { execFileSync } from "node:child_process";

/**
 * Runs the cleanup in its own process.
 *
 * Playwright loads config files through a CommonJS-ish loader that chokes on
 * the generated Prisma client's ESM. The seed has the same problem and solves
 * it the same way — `tsx`, one level removed.
 */
export default function teardown() {
  execFileSync("pnpm", ["exec", "tsx", "e2e/cleanup.ts"], {
    stdio: "inherit",
  });
}
