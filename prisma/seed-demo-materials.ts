import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  MaterialCategory,
  PrismaClient,
  StockReason,
} from "../src/generated/prisma/client";
import { rebuildAvgCost } from "../src/lib/money";

/**
 * Demo material spending for "Musim Tanam 1", so the season's report has
 * something to show a room full of people.
 *
 * Written as **usage**, not as purchases. Buying a sack does not cost a season
 * anything — the shed simply becomes worth more. The expense lands when the
 * sack is opened, which is why every rupiah here arrives as a `USAGE` movement
 * carrying `seasonId`, mirroring what `recordTaskUsage` freezes onto a task.
 * A purchase is written first only so the shelf has something to give up.
 *
 * Every row it writes is tagged, and `--undo` removes exactly those rows and
 * nothing else. Fabricated numbers that cannot be found again later are how a
 * demo turns into a permanent lie in someone's books.
 *
 *   pnpm exec tsx prisma/seed-demo-materials.ts
 *   pnpm exec tsx prisma/seed-demo-materials.ts --undo
 */

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL / DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Stamped on every row this script writes. The only handle `--undo` has. */
const TAG = "[demo]";

const SEASON_NAME = "Musim Tanam 1";

type Line = {
  name: string;
  unit: string;
  category: MaterialCategory;
  minStock: number;
  /** Dibeli dulu, supaya raknya punya sesuatu untuk dikeluarkan. */
  buyQty: number;
  buyCost: number;
  buyOn: string;
  /** Yang benar-benar dipakai musim ini — inilah biayanya. */
  useQty: number;
  useCost: number;
  useOn: string;
  purpose: string;
};

/**
 * Rp 5.123.079 of usage, which lands on Rp 5.125.959 once the Rp 2.880 already
 * frozen onto the season's one existing task is added.
 *
 * Dolomit carries the odd rupiah. That is where an odd number belongs: it is
 * bought by the truckload with delivery folded into the price, so its per-kilo
 * rate was never round to begin with.
 */
const lines: Line[] = [
  {
    name: "Bibit Rawit Ori 212",
    unit: "pcs",
    category: MaterialCategory.SEED,
    minStock: 0,
    buyQty: 320,
    buyCost: 1_120_000,
    buyOn: "2026-01-05",
    useQty: 300,
    useCost: 1_050_000,
    useOn: "2026-01-11",
    purpose: "Tanam awal 230 pokok, sisanya cadangan sulam",
  },
  {
    name: "Pupuk Kandang",
    unit: "kg",
    category: MaterialCategory.FERTILIZER,
    minStock: 50,
    buyQty: 700,
    buyCost: 1_050_000,
    buyOn: "2026-01-06",
    useQty: 600,
    useCost: 900_000,
    useOn: "2026-01-09",
    purpose: "Pupuk dasar bedengan",
  },
  {
    name: "Mulsa Plastik Hitam Perak",
    unit: "meter",
    category: MaterialCategory.MULCH,
    minStock: 0,
    buyQty: 600,
    buyCost: 780_000,
    buyOn: "2026-01-06",
    useQty: 500,
    useCost: 650_000,
    useOn: "2026-01-08",
    purpose: "Pasang mulsa sepuluh bedengan",
  },
  {
    name: "NPK 16-16-16",
    unit: "gram",
    category: MaterialCategory.FERTILIZER,
    minStock: 2000,
    buyQty: 25_000,
    buyCost: 800_000,
    buyOn: "2026-02-14",
    useQty: 20_000,
    useCost: 640_000,
    useOn: "2026-03-20",
    purpose: "Kocor rutin vegetatif sampai generatif",
  },
  {
    name: "Insektisida Prevathon",
    unit: "ml",
    category: MaterialCategory.PESTICIDE,
    minStock: 100,
    buyQty: 600,
    buyCost: 570_000,
    buyOn: "2026-03-02",
    useQty: 500,
    useCost: 475_000,
    useOn: "2026-05-10",
    purpose: "Semprot thrips dan ulat grayak",
  },
  {
    name: "Ajir Bambu",
    unit: "pcs",
    category: MaterialCategory.SUPPLIES,
    minStock: 50,
    buyQty: 400,
    buyCost: 500_000,
    buyOn: "2026-02-01",
    useQty: 300,
    useCost: 375_000,
    useOn: "2026-02-05",
    purpose: "Pasang ajir dan tali",
  },
  {
    name: "Dolomit",
    unit: "kg",
    category: MaterialCategory.FERTILIZER,
    minStock: 25,
    buyQty: 300,
    buyCost: 420_695,
    buyOn: "2026-01-04",
    useQty: 250,
    useCost: 350_579,
    useOn: "2026-01-05",
    purpose: "Kapur bedengan sebelum tanam",
  },
  {
    name: "Calnit",
    unit: "gram",
    category: MaterialCategory.FERTILIZER,
    minStock: 2000,
    buyQty: 15_000,
    buyCost: 375_000,
    buyOn: "2026-04-02",
    useQty: 10_000,
    useCost: 250_000,
    useOn: "2026-05-01",
    purpose: "Cegah busuk ujung buah",
  },
  {
    name: "KCl",
    unit: "gram",
    category: MaterialCategory.FERTILIZER,
    minStock: 1000,
    buyQty: 12_000,
    buyCost: 264_000,
    buyOn: "2026-04-02",
    useQty: 10_000,
    useCost: 220_000,
    useOn: "2026-05-15",
    purpose: "Pembesaran buah",
  },
  {
    name: "Perekat Perata",
    unit: "ml",
    category: MaterialCategory.OTHER,
    minStock: 200,
    buyQty: 1_200,
    buyCost: 174_000,
    buyOn: "2026-03-02",
    useQty: 1_000,
    useCost: 145_000,
    useOn: "2026-06-01",
    purpose: "Campuran tiap kali semprot",
  },
  {
    name: "Avidor",
    unit: "gram",
    category: MaterialCategory.FUNGICIDE,
    minStock: 200,
    buyQty: 1_000,
    buyCost: 67_500,
    buyOn: "2026-03-15",
    useQty: 1_000,
    useCost: 67_500,
    useOn: "2026-06-20",
    purpose: "Penanganan antraknosa",
  },
];

async function seasonId(): Promise<string> {
  const season = await prisma.season.findFirst({
    where: { name: SEASON_NAME },
    select: { id: true },
  });

  if (!season) throw new Error(`Musim "${SEASON_NAME}" tidak ditemukan.`);
  return season.id;
}

/**
 * Recomputes stock and average price from the movement log.
 *
 * `Material.avgCost` is a cache of `rebuildAvgCost` and nothing else, so a
 * script that writes movements has to leave it reproducible — including after
 * `--undo`, where deleting purchases must walk the price back.
 */
async function reconcile(materialIds: string[]) {
  for (const id of materialIds) {
    const movements = await prisma.stockMovement.findMany({
      where: { materialId: id },
      orderBy: { createdAt: "asc" },
      select: { delta: true, reason: true, totalCost: true },
    });

    await prisma.material.update({
      where: { id },
      data: {
        stock: movements.reduce((sum, row) => sum + row.delta, 0),
        avgCost: rebuildAvgCost(movements),
      },
    });
  }
}

async function undo() {
  const movements = await prisma.stockMovement.findMany({
    where: { note: { startsWith: TAG } },
    select: { id: true, materialId: true },
  });

  await prisma.stockMovement.deleteMany({
    where: { id: { in: movements.map((row) => row.id) } },
  });

  // Order matters: the materials have to be reconciled while they still exist,
  // and only then can the ones this script invented be dropped.
  await reconcile([...new Set(movements.map((row) => row.materialId))]);

  // Only materials this script created, and only if nothing has since attached
  // itself to them — a recipe or a task built on top of a demo row is real work
  // and outranks the cleanup.
  const invented = await prisma.material.findMany({
    where: { notes: { startsWith: TAG } },
    select: {
      id: true,
      name: true,
      _count: {
        select: { movements: true, recipeItems: true, taskUsages: true },
      },
    },
  });

  const removable = invented.filter(
    (row) =>
      row._count.movements === 0 &&
      row._count.recipeItems === 0 &&
      row._count.taskUsages === 0
  );

  await prisma.material.deleteMany({
    where: { id: { in: removable.map((row) => row.id) } },
  });

  for (const row of invented) {
    if (!removable.includes(row)) {
      console.log(`  ${row.name} dibiarkan — sudah dipakai di tempat lain.`);
    }
  }

  console.log(
    `${movements.length} pergerakan stok dan ${removable.length} bahan demo dihapus.`
  );
}

async function seed() {
  const season = await seasonId();

  // Whoever is logged as having done it. Logistics keeps the shed.
  const actor = await prisma.user.findFirst({
    where: { role: "LOGISTICS", deletedAt: null },
    select: { id: true },
  });

  // Re-runnable: clear what a previous run wrote before writing again, so the
  // total lands on the same figure instead of doubling.
  await undo();

  const touched: string[] = [];
  let charged = 0;

  for (const line of lines) {
    const material = await prisma.material.upsert({
      where: { name: line.name },
      // An existing material keeps its own unit, category and notes — this
      // script is adding spending to the shed, not rewriting what is in it.
      update: {},
      create: {
        name: line.name,
        unit: line.unit,
        category: line.category,
        minStock: line.minStock,
        notes: `${TAG} bahan contoh buat demo, aman dihapus`,
      },
      select: { id: true },
    });

    await prisma.stockMovement.create({
      data: {
        materialId: material.id,
        delta: line.buyQty,
        reason: StockReason.PURCHASE,
        totalCost: line.buyCost,
        // Deliberately no seasonId: a purchase belongs to the shed, not to a
        // planting. Charging it here would bill this season for stock the next
        // one will finish.
        note: `${TAG} belanja ${line.name}`,
        actorId: actor?.id,
        createdAt: new Date(`${line.buyOn}T02:00:00.000Z`),
      },
    });

    await prisma.stockMovement.create({
      data: {
        materialId: material.id,
        delta: -line.useQty,
        reason: StockReason.USAGE,
        totalCost: line.useCost,
        seasonId: season,
        note: `${TAG} ${line.purpose}`,
        actorId: actor?.id,
        createdAt: new Date(`${line.useOn}T02:00:00.000Z`),
      },
    });

    touched.push(material.id);
    charged += line.useCost;
  }

  await reconcile(touched);

  const fromTasks = await prisma.taskMaterial.aggregate({
    where: { task: { seasonId: season }, totalCost: { not: null } },
    _sum: { totalCost: true },
  });

  const rupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  console.log(`${lines.length} bahan dipakai di ${SEASON_NAME}.`);
  console.log(`  dari rak  : ${rupiah(charged)}`);
  console.log(`  dari tugas: ${rupiah(fromTasks._sum.totalCost ?? 0)}`);
  console.log(`  total     : ${rupiah(charged + (fromTasks._sum.totalCost ?? 0))}`);
}

const main = process.argv.includes("--undo") ? undo : seed;

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
