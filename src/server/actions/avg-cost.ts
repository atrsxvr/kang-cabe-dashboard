import { prisma } from "@/lib/prisma";
import { rebuildAvgCost } from "@/lib/money";

/**
 * Recomputes a material's average price from its movement log.
 *
 * `Material.avgCost` is a cache of exactly this. Anything that changes history
 * rather than appending to it has to call this, or the stored figure quietly
 * stops matching the rows it claims to summarise.
 *
 * Kept out of the "use server" modules on purpose: an exported async function
 * there becomes a Server Action anyone can call.
 */
export async function refreshAvgCost(materialId: string) {
  const movements = await prisma.stockMovement.findMany({
    where: { materialId },
    orderBy: { createdAt: "asc" },
    select: { delta: true, reason: true, totalCost: true },
  });

  await prisma.material.update({
    where: { id: materialId },
    data: { avgCost: rebuildAvgCost(movements) },
  });
}
