import "server-only";

import { summariseCash, type CashEntry, type CashTotals } from "@/lib/cash";
import { lineTotal } from "@/lib/harvest";
import { outstandingByMember } from "@/lib/loans";
import { roundUpToCash } from "@/lib/money";
import { prisma } from "@/lib/prisma";

/**
 * Kas lintas musim.
 *
 * **Tidak menerima `seasonId`, dan itu sengaja** — pengecualian yang sama
 * dengan gudang. Uang di kas dipakai bersama: modal yang disetor di awal
 * membiayai beberapa musim, dan sisa satu musim membiayai musim berikutnya.
 * Memotongnya per musim akan menghasilkan saldo yang tidak pernah ada di
 * dompet siapa pun. Setiap baris di buku kas tetap menyebut musimnya kalau ia
 * punya satu.
 */

export type CashReport = CashTotals & {
  /** Belanja yang harganya belum diisi — uangnya keluar tapi belum terhitung. */
  unpricedPurchases: number;
  /** Penjualan yang belum dibayar: akan masuk, tapi belum ada di tangan. */
  receivable: number;
  receivableCount: number;
};

const toolEventLabels: Record<string, string> = {
  ACQUIRED: "beli",
  SERVICED: "servis",
};

export async function cashReport(): Promise<CashReport> {
  const [
    openings,
    contributions,
    sales,
    financeEntries,
    purchases,
    unpricedPurchases,
    toolEvents,
    payouts,
    loans,
  ] = await Promise.all([
    prisma.cashOpening.findMany({
      select: { id: true, amount: true, countedAt: true, note: true },
    }),
    prisma.capitalContribution.findMany({
      select: {
        id: true,
        amount: true,
        paidAt: true,
        note: true,
        user: { select: { name: true } },
      },
    }),
    prisma.saleTransaction.findMany({
      select: {
        id: true,
        buyer: { select: { name: true } },
        soldAt: true,
        isPaid: true,
        paidAt: true,
        season: { select: { name: true } },
        items: { select: { weightKg: true, pricePerKg: true } },
      },
    }),
    prisma.financeTransaction.findMany({
      select: {
        id: true,
        type: true,
        category: true,
        amount: true,
        description: true,
        date: true,
        season: { select: { name: true } },
      },
    }),
    prisma.stockMovement.findMany({
      where: { reason: "PURCHASE", totalCost: { not: null } },
      select: {
        id: true,
        totalCost: true,
        createdAt: true,
        note: true,
        material: { select: { name: true } },
      },
    }),
    prisma.stockMovement.count({
      where: { reason: "PURCHASE", totalCost: null },
    }),
    prisma.toolEvent.findMany({
      where: { totalCost: { not: null } },
      select: {
        id: true,
        type: true,
        totalCost: true,
        createdAt: true,
        tool: { select: { name: true } },
      },
    }),
    prisma.memberPayout.findMany({
      select: {
        id: true,
        type: true,
        amount: true,
        paidAt: true,
        note: true,
        user: { select: { name: true } },
        season: { select: { name: true } },
      },
    }),
    prisma.memberLoan.findMany({
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        note: true,
        payoutId: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const entries: CashEntry[] = [];
  let receivable = 0;
  let receivableCount = 0;

  for (const row of openings) {
    entries.push({
      id: `opening:${row.id}`,
      date: row.countedAt,
      source: "OPENING",
      amount: row.amount,
      label: row.note ?? "Saldo awal kas",
      detail: null,
    });
  }

  for (const row of contributions) {
    entries.push({
      id: `capital:${row.id}`,
      date: row.paidAt,
      source: "CAPITAL",
      amount: row.amount,
      label: row.user.name,
      detail: row.note,
    });
  }

  for (const sale of sales) {
    // Dibulatkan sekali di transaksinya, persis seperti yang dibayar pembeli.
    const total = roundUpToCash(
      sale.items.reduce(
        (sum, item) => sum + lineTotal(item.weightKg, item.pricePerKg),
        0
      )
    );

    if (!sale.isPaid) {
      receivable += total;
      receivableCount += 1;
      continue;
    }

    entries.push({
      id: `sale:${sale.id}`,
      // Uang masuk pada hari dibayar, bukan hari cabainya diangkut.
      date: sale.paidAt ?? sale.soldAt,
      source: "SALE",
      amount: total,
      label: sale.buyer.name,
      detail: sale.season.name,
    });
  }

  for (const row of financeEntries) {
    entries.push({
      id: `finance:${row.id}`,
      date: row.date,
      source: row.type === "INCOME" ? "OTHER_INCOME" : "EXPENSE",
      amount: row.amount,
      label: row.description,
      detail: `${row.category} · ${row.season.name}`,
    });
  }

  for (const row of purchases) {
    entries.push({
      id: `purchase:${row.id}`,
      date: row.createdAt,
      source: "PURCHASE",
      amount: row.totalCost ?? 0,
      label: row.material.name,
      detail: row.note,
    });
  }

  for (const row of toolEvents) {
    entries.push({
      id: `tool:${row.id}`,
      date: row.createdAt,
      source: "TOOL",
      amount: row.totalCost ?? 0,
      label: row.tool.name,
      detail: toolEventLabels[row.type] ?? null,
    });
  }

  for (const row of payouts) {
    entries.push({
      id: `payout:${row.id}`,
      date: row.paidAt,
      source: row.type === "PROFIT_SHARE" ? "PROFIT_SHARE" : "CAPITAL_RETURN",
      amount: row.amount,
      label: row.user.name,
      detail: row.season?.name ?? row.note,
    });
  }

  for (const row of loans) {
    entries.push({
      id: `loan:${row.id}`,
      date: row.date,
      source: row.type === "LENT" ? "LOAN_OUT" : "LOAN_REPAID",
      amount: row.amount,
      label: row.user.name,
      detail: row.payoutId ? "dipotong dari bagi hasil" : row.note,
    });
  }

  return {
    ...summariseCash(entries),
    unpricedPurchases,
    receivable,
    receivableCount,
  };
}

export type PayoutRow = {
  id: string;
  type: "PROFIT_SHARE" | "CAPITAL_RETURN";
  amount: number;
  paidAt: Date;
  note: string | null;
  proofUrl: string | null;
  user: { id: string; name: string };
  season: { id: string; name: string } | null;
  /** The loan repayment cut from this profit share, if any. */
  loanOffset: { amount: number } | null;
};

export async function listPayouts(): Promise<PayoutRow[]> {
  return prisma.memberPayout.findMany({
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      amount: true,
      paidAt: true,
      note: true,
      proofUrl: true,
      user: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
      loanOffset: { select: { amount: true } },
    },
  });
}

export type OpeningRow = {
  id: string;
  amount: number;
  countedAt: Date;
  note: string | null;
};

export async function listOpenings(): Promise<OpeningRow[]> {
  return prisma.cashOpening.findMany({
    orderBy: [{ countedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, amount: true, countedAt: true, note: true },
  });
}

export type LoanEntryRow = {
  id: string;
  type: "LENT" | "REPAID";
  amount: number;
  date: Date;
  note: string | null;
  /** Set when the repayment was cut from a profit share; deleted with it. */
  payoutId: string | null;
  user: { id: string; name: string };
};

export type LoanReport = {
  /** Newest first. */
  entries: LoanEntryRow[];
  /** What each member still owes the kas, only those who owe anything. */
  outstanding: { user: { id: string; name: string }; amount: number }[];
  /** Same figures by user id, for the forms. */
  balances: Record<string, number>;
};

/** Uang kas yang dipinjam anggota, dan sisa yang belum kembali. Lintas musim. */
export async function loanReport(): Promise<LoanReport> {
  const entries = await prisma.memberLoan.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      amount: true,
      date: true,
      note: true,
      payoutId: true,
      user: { select: { id: true, name: true } },
    },
  });

  const balances = outstandingByMember(
    entries.map((entry) => ({
      userId: entry.user.id,
      type: entry.type,
      amount: entry.amount,
    }))
  );
  const names = new Map(entries.map((entry) => [entry.user.id, entry.user]));

  return {
    entries,
    outstanding: [...balances]
      .map(([userId, amount]) => ({ user: names.get(userId)!, amount }))
      .sort((a, b) => b.amount - a.amount),
    balances: Object.fromEntries(balances),
  };
}

/**
 * What one member still owes the kas, leaving out the repayment cut from
 * `excludePayoutId` — the share being edited, whose cut is about to be
 * recomputed.
 */
export async function loanOutstanding(
  userId: string,
  excludePayoutId?: string
): Promise<number> {
  const rows = await prisma.memberLoan.groupBy({
    by: ["type"],
    where: {
      userId,
      ...(excludePayoutId
        ? { OR: [{ payoutId: null }, { payoutId: { not: excludePayoutId } }] }
        : {}),
    },
    _sum: { amount: true },
  });
  const sum = (type: "LENT" | "REPAID") =>
    rows.find((row) => row.type === type)?._sum.amount ?? 0;
  return sum("LENT") - sum("REPAID");
}
