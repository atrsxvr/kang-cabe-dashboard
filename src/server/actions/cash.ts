"use server";

import { ledgerPage, type LedgerRow } from "@/lib/cash";
import { currentActor } from "@/server/auth/guard";
import { cashReport } from "@/server/queries/cash";

/**
 * The next slice of the buku kas, or one month of it.
 *
 * Reading, not writing — every member may read the books — so no area
 * guard, but still only for whoever is signed in: a Server Action is a public
 * endpoint. Computed from the full report every time, so each row carries the
 * same running balance it shows when the whole book is open.
 */
export async function loadCashLedger(
  offset: number,
  month: string | null
): Promise<{ rows: LedgerRow[]; total: number; hasMore: boolean } | null> {
  if (!(await currentActor())) return null;

  const start = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const wanted = typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : null;

  return ledgerPage((await cashReport()).ledger, { offset: start, month: wanted });
}
