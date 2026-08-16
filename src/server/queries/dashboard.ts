import "server-only";

import { prisma } from "@/lib/prisma";
import { daysUntil, trailingWindows, weekendRange } from "@/lib/hst";

/**
 * Outstanding tasks due on this week's Saturday or Sunday, for the given
 * season. DONE tasks are excluded — the card exists to say what still needs
 * doing, not how much was scheduled.
 */
export async function countWeekendTasks(
  seasonId: string,
  now: Date = new Date()
): Promise<{ outstanding: number; total: number; from: Date; to: Date }> {
  const { start, end, saturday, sunday } = weekendRange(now);

  const where = { seasonId, dueDate: { gte: start, lt: end } };

  const [outstanding, total] = await Promise.all([
    prisma.task.count({ where: { ...where, status: { not: "DONE" } } }),
    prisma.task.count({ where }),
  ]);

  return { outstanding, total, from: saturday, to: sunday };
}

/**
 * Everything the overview needs, in one pass.
 *
 * Deliberately one query module rather than seven scattered calls: the
 * dashboard is the page most likely to be opened on a phone at the edge of a
 * field, and each extra round trip is a second someone stands there waiting.
 */

export type DueTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: Date;
  /** Negatif berarti telat sekian hari. */
  daysLeft: number;
  assignees: string[];
};

export type MixCapacity = {
  id: string;
  name: string;
  /** Berapa kali lagi racikan ini bisa diracik dengan stok sekarang. */
  batches: number;
  /** Bahan yang paling dulu habis — itu yang menentukan angka di atas. */
  limitedBy: string;
  basisVolumeL: number;
};

export type HarvestTrend = {
  /** Bagus saja — sama dengan angka utama di halaman Panen. */
  thisWeekKg: number;
  lastWeekKg: number;
  /** Afkir minggu ini, dilaporkan terpisah dan tidak ikut tren. */
  thisWeekRejectKg: number;
  /** Selisih persen. Null kalau minggu lalu nol — tidak ada pembanding. */
  changePercent: number | null;
};

export type SafeHarvest = {
  recipeName: string;
  appliedAt: Date;
  safeFrom: Date;
  daysLeft: number;
};

export type Overview = {
  dueToday: DueTask[];
  overdue: DueTask[];
  awaitingDiagnosis: number;
  unrecordedUsage: number;
  mixCapacity: MixCapacity[];
  harvestTrend: HarvestTrend;
  /** Masa tunggu panen yang masih berjalan, paling lama dulu. */
  harvestBlocks: SafeHarvest[];
};

export async function overview(
  seasonId: string,
  now: Date = new Date()
): Promise<Overview> {
  const today = startOfJakartaDay(now);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  // Tujuh hari termasuk hari ini, dan tujuh hari sebelumnya — sama panjang,
  // supaya persentasenya membandingkan hal yang sebanding.
  const week = trailingWindows(7, now);

  const [
    open,
    awaitingDiagnosis,
    unrecordedUsage,
    materials,
    recipes,
    thisWeek,
    lastWeek,
    sprayed,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { seasonId, status: { not: "DONE" }, dueDate: { lt: tomorrow } },
      orderBy: { dueDate: "asc" },
      take: 12,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        assignees: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.healthLog.count({ where: { seasonId, status: "REPORTED" } }),
    prisma.task.count({
      where: {
        seasonId,
        status: "DONE",
        usageRecordedAt: null,
        materials: { some: {} },
      },
    }),
    prisma.material.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, stock: true },
    }),
    prisma.recipe.findMany({
      where: { kind: "ROUTINE" },
      select: {
        id: true,
        name: true,
        basisVolumeL: true,
        items: {
          select: {
            amountPerLiter: true,
            material: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.harvestLog.aggregate({
      where: {
        seasonId,
        harvestDate: { gte: week.current.start, lt: week.current.end },
      },
      _sum: { goodKg: true, rejectKg: true },
    }),
    prisma.harvestLog.aggregate({
      where: {
        seasonId,
        harvestDate: { gte: week.previous.start, lt: week.previous.end },
      },
      _sum: { goodKg: true, rejectKg: true },
    }),
    // A spray blocks picking for a while afterwards, and the recipe is the
    // only place that waiting period is written down.
    prisma.task.findMany({
      where: {
        seasonId,
        completedAt: { not: null },
        recipe: { preHarvestIntervalDays: { not: null } },
      },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: {
        completedAt: true,
        recipe: { select: { name: true, preHarvestIntervalDays: true } },
      },
    }),
  ]);

  const stock = new Map(materials.map((row) => [row.id, row]));

  const toDue = (task: (typeof open)[number]): DueTask => ({
    id: task.id,
    title: task.title,
    status: task.status,
    dueDate: task.dueDate,
    daysLeft: daysUntil(task.dueDate, now),
    assignees: task.assignees.map((row) => row.user.name),
  });

  const due = open.map(toDue);

  // Bagus saja, seperti setiap angka hasil panen lain di aplikasi ini. Halaman
  // Panen memberi judul "Panen layak jual" pada Bagus dan menaruh totalnya di
  // baris kecil; dashboard yang menjumlahkan keduanya membuat dua halaman
  // memakai kata "panen" untuk dua bilangan berbeda tanpa satu pun menyebutnya.
  const thisWeekKg = thisWeek._sum.goodKg ?? 0;
  const lastWeekKg = lastWeek._sum.goodKg ?? 0;
  const thisWeekRejectKg = thisWeek._sum.rejectKg ?? 0;

  return {
    dueToday: due.filter((task) => task.daysLeft === 0),
    overdue: due.filter((task) => task.daysLeft < 0),
    awaitingDiagnosis,
    unrecordedUsage,
    mixCapacity: recipes
      .map((recipe) => {
        // How many more batches the shed allows, decided by whichever
        // ingredient runs out first.
        let batches = Infinity;
        let limitedBy = "";

        for (const item of recipe.items) {
          const have = stock.get(item.material.id)?.stock ?? 0;
          const needed = item.amountPerLiter * recipe.basisVolumeL;
          const possible = needed > 0 ? Math.floor(have / needed) : Infinity;

          if (possible < batches) {
            batches = possible;
            limitedBy = item.material.name;
          }
        }

        return {
          id: recipe.id,
          name: recipe.name,
          basisVolumeL: recipe.basisVolumeL,
          batches: Number.isFinite(batches) ? batches : 0,
          limitedBy,
        };
      })
      .filter((row) => row.limitedBy !== "")
      .sort((a, b) => a.batches - b.batches)
      .slice(0, 4),
    harvestTrend: {
      thisWeekKg,
      lastWeekKg,
      thisWeekRejectKg,
      changePercent:
        lastWeekKg > 0
          ? Math.round(((thisWeekKg - lastWeekKg) / lastWeekKg) * 100)
          : null,
    },
    harvestBlocks: sprayed
      .flatMap((task) => {
        if (!task.completedAt || !task.recipe?.preHarvestIntervalDays) return [];

        const safeFrom = new Date(task.completedAt);
        safeFrom.setDate(
          safeFrom.getDate() + task.recipe.preHarvestIntervalDays
        );

        const daysLeft = daysUntil(safeFrom, now);
        if (daysLeft <= 0) return [];

        return [
          {
            recipeName: task.recipe.name,
            appliedAt: task.completedAt,
            safeFrom,
            daysLeft,
          },
        ];
      })
      .sort((a, b) => b.daysLeft - a.daysLeft),
  };
}

/** Midnight in Jakarta, as an instant. */
function startOfJakartaDay(now: Date): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(now);
  return new Date(`${key}T00:00:00+07:00`);
}
