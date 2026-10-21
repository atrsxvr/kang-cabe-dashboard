import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { FAKE_PUSH_ORIGIN } from "./push";

/**
 * Removes everything the specs made.
 *
 * These tests drive the real UI, so they write real rows. In CI that is a
 * throwaway container and this is merely tidy; run locally it is what keeps a
 * test from leaving debris in the garden's actual records.
 *
 * Everything the specs create is prefixed "E2E", and nothing else is touched.
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

async function cleanup() {
  if (!connectionString) return;

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const materials = await prisma.material.findMany({
      where: { name: { startsWith: "E2E " } },
      select: { id: true },
    });
    const materialIds = materials.map((row) => row.id);

    const tasks = await prisma.task.findMany({
      where: { title: { startsWith: "E2E " } },
      select: { id: true },
    });
    const taskIds = tasks.map((row) => row.id);

    await prisma.taskMaterial.deleteMany({
      where: { OR: [{ taskId: { in: taskIds } }, { materialId: { in: materialIds } }] },
    });
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.stockMovement.deleteMany({
      where: { materialId: { in: materialIds } },
    });
    await prisma.recipeItem.deleteMany({
      where: { materialId: { in: materialIds } },
    });
    await prisma.material.deleteMany({ where: { id: { in: materialIds } } });
    await prisma.recipe.deleteMany({ where: { name: { startsWith: "E2E " } } });

    await prisma.saleTransaction.deleteMany({
      where: { buyer: { name: { startsWith: "E2E " } } },
    });
    // Buyers last, and only those left without sales: a test buyer whose
    // sales went with an E2E season is gone with them, and a real buyer is
    // never named "E2E …".
    const buyers = await prisma.buyer.deleteMany({
      where: { name: { startsWith: "E2E " }, sales: { none: {} } },
    });

    // Uang keluar lebih dulu: ia menunjuk musim, dan catatan ini tidak ikut
    // terhapus bersama musimnya — hanya kehilangan labelnya.
    const payouts = await prisma.memberPayout.deleteMany({
      where: { note: { startsWith: "E2E " } },
    });
    const openings = await prisma.cashOpening.deleteMany({
      where: { note: { startsWith: "E2E " } },
    });
    const contributions = await prisma.capitalContribution.deleteMany({
      where: { note: { startsWith: "E2E " } },
    });

    // Cascades to the tasks, findings, harvests and sales under it.
    const seasons = await prisma.season.deleteMany({
      where: { name: { startsWith: "E2E " } },
    });

    // Sesi yang dibuat auth.setup.ts. Token bukan sekadar baris data — ia kunci
    // yang masih bisa diputar sampai kedaluwarsa, jadi ia dibuang seperti yang
    // lain, bukan dibiarkan menunggu waktu.
    const sessions = await prisma.session.deleteMany({
      where: { token: { startsWith: "E2E-session-" } },
    });

    // Langganan notifikasi palsu dari notifications.spec.ts. Ia menempel pada
    // anggota sungguhan — sesi tes memakai Admin yang ada — jadi dikenali dari
    // alamatnya, yang tidak mungkin dimiliki HP mana pun.
    const devices = await prisma.pushSubscription.deleteMany({
      where: { endpoint: { startsWith: FAKE_PUSH_ORIGIN } },
    });

    console.log(
      `Teardown: ${materialIds.length} bahan, ${taskIds.length} tugas, ${seasons.count} musim, ${contributions.count} setoran, ${payouts.count} uang keluar, ${openings.count} saldo awal, ${buyers.count} pembeli, ${sessions.count} sesi, ${devices.count} langganan notifikasi E2E dibersihkan.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

cleanup().catch((error) => {
  console.error(error);
  process.exit(1);
});
