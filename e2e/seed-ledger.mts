/**
 * Seratus dua puluh pengeluaran di musim E2E sendiri, untuk cash-ledger.spec.ts.
 *
 * Lewat tsx dan bukan lewat formulir: mengetik 120 catatan satu per satu
 * menguji formulirnya 120 kali, bukan buku kasnya. Dipisah dari spec-nya
 * karena pemuat Playwright tidak bisa memuat klien Prisma (lihat
 * global-teardown.ts). Musimnya berawalan "E2E", jadi teardown membuangnya
 * beserta seluruh catatannya.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  }),
});

try {
  const season = await prisma.season.create({
    data: {
      name: `E2E Musim Buku Kas ${Date.now()}`,
      variety: "E2E Rawit",
      plantCount: 1,
      startDate: new Date("2020-01-01"),
      status: "ACTIVE",
    },
  });

  // One a day from 1 January 2020: four months, February holding 29.
  await prisma.financeTransaction.createMany({
    data: Array.from({ length: 120 }, (_, index) => ({
      seasonId: season.id,
      type: "EXPENSE" as const,
      category: "Operasional",
      amount: 1000,
      description: `E2E biaya ${String(index).padStart(3, "0")}`,
      date: new Date(Date.UTC(2020, 0, 1 + index)),
    })),
  });
} finally {
  await prisma.$disconnect();
}
