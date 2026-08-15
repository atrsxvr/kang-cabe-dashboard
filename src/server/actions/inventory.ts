"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { nextAvgCost, rebuildAvgCost } from "@/lib/money";
import { OPNAME_PREFIX } from "@/lib/stock";
import { listMovements, type MovementRow } from "@/server/queries/inventory";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import {
  adjustStockSchema,
  changesQuantity,
  createShoppingNoteSchema,
  createToolSchema,
  archiveMaterialSchema,
  recordToolEventSchema,
  setMovementCostSchema,
  stockOpnameSchema,
  toggleShoppingNoteSchema,
  updateToolSchema,
} from "@/server/actions/schemas";

/**
 * The stock history of one material, fetched when its dialog opens.
 *
 * Loaded on demand rather than shipped with the table: the shed only ever
 * shows a handful of rows at a time, and sending every movement for every
 * material to open one of them would grow with the log forever.
 */
export async function getMaterialMovements(
  materialId: string
): Promise<MovementRow[]> {
  if (!materialId) return [];
  return listMovements(materialId, 30);
}

/**
 * Stock and the movement that caused it are written together. A number that
 * changed with no record of why is exactly what this module exists to stop.
 */
export async function adjustStock(formData: FormData): Promise<ActionResult> {
  const parsed = adjustStockSchema.safeParse({
    materialId: formData.get("materialId"),
    delta: formData.get("delta"),
    reason: formData.get("reason"),
    totalCost: formData.get("totalCost") || undefined,
    seasonId: formData.get("seasonId") ?? "",
    note: formData.get("note") ?? "",
    actorId: formData.get("actorId") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { materialId, delta, reason, totalCost, seasonId, note, actorId } =
    parsed.data;

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { stock: true, name: true, avgCost: true },
  });

  if (!material) return { ok: false, message: "Bahan tidak ditemukan." };

  // Stock cannot go below zero: a negative sack is not a thing, and letting it
  // happen would quietly corrupt every "cukup tidak" answer afterwards.
  if (material.stock + delta < 0) {
    return {
      ok: false,
      message: `Stok ${material.name} tinggal ${material.stock}. Tidak bisa dikurangi ${Math.abs(delta)}.`,
      fieldErrors: { delta: "Melebihi stok yang ada" },
    };
  }

  await prisma.$transaction([
    prisma.material.update({
      where: { id: materialId },
      data: {
        stock: { increment: delta },
        // Buying is the only thing that moves the price. Taking stock out
        // changes what is left, not what it cost.
        avgCost: nextAvgCost({
          stock: material.stock,
          avgCost: material.avgCost,
          addedQty: delta,
          addedCost: reason === "PURCHASE" ? (totalCost ?? null) : null,
        }),
      },
    }),
    prisma.stockMovement.create({
      data: {
        materialId,
        delta,
        reason,
        // For a purchase this is money paid. For stock charged to a season it
        // is the value of what left, priced at the average — the same figure
        // recordTaskUsage freezes onto a task.
        totalCost:
          reason === "PURCHASE"
            ? (totalCost ?? null)
            : seasonId
              ? Math.round(Math.abs(delta) * material.avgCost)
              : null,
        seasonId: seasonId ? seasonId : null,
        note: note ? note : null,
        actorId: actorId ? actorId : null,
      },
    }),
  ]);

  revalidatePath("/inventory");
  revalidatePath("/health/racikan");
  revalidatePath("/finance");
  return { ok: true };
}

/**
 * Archives a material instead of deleting it.
 *
 * Deleting cascades to the whole movement log, which now carries what each
 * usage cost and which season it was charged to — so a closed season's report
 * would quietly change months later. Archiving hides the row from the shed and
 * from every picker without destroying anything, and is reversible.
 */
export async function archiveMaterial(
  formData: FormData
): Promise<ActionResult> {
  const parsed = archiveMaterialSchema.safeParse({
    materialId: formData.get("materialId"),
    restore: formData.get("restore") ?? undefined,
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { materialId, restore } = parsed.data;

  const result = await prisma.material.updateMany({
    where: { id: materialId },
    data: { archivedAt: restore ? null : new Date() },
  });

  if (result.count === 0) {
    return { ok: false, message: "Bahan tidak ditemukan." };
  }

  revalidatePath("/inventory");
  revalidatePath("/health/racikan");
  return { ok: true };
}

/**
 * Fills in the price of a purchase that was recorded without one.
 *
 * The average it feeds is rebuilt from the whole movement log rather than
 * nudged, because this price belongs somewhere in the middle of that history —
 * every purchase after it was averaged against a figure that is now wrong.
 */
export async function setMovementCost(
  formData: FormData
): Promise<ActionResult> {
  const parsed = setMovementCostSchema.safeParse({
    movementId: formData.get("movementId"),
    totalCost: formData.get("totalCost"),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { movementId, totalCost } = parsed.data;

  const movement = await prisma.stockMovement.findUnique({
    where: { id: movementId },
    select: { materialId: true, reason: true, totalCost: true },
  });

  if (!movement) return { ok: false, message: "Catatan tidak ditemukan." };

  if (movement.reason !== "PURCHASE") {
    return { ok: false, message: "Cuma catatan belanja yang punya harga." };
  }

  if (movement.totalCost !== null) {
    return { ok: false, message: "Harganya sudah diisi." };
  }

  await prisma.stockMovement.update({
    where: { id: movementId },
    data: { totalCost },
  });

  await refreshAvgCost(movement.materialId);

  revalidatePath("/inventory");
  revalidatePath("/finance");
  return { ok: true };
}

/**
 * Recomputes a material's average price from its movement log.
 *
 * `Material.avgCost` is a cache of exactly this. Anything that changes history
 * rather than appending to it has to call this, or the stored figure quietly
 * stops matching the rows it claims to summarise.
 */
async function refreshAvgCost(materialId: string) {
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

/**
 * Reconciles recorded stock against a physical count.
 *
 * Only rows that actually differ are written. An opname where everything
 * matches should leave no trace in the movement log — otherwise the history
 * fills with noise and the real corrections stop standing out.
 */
export async function recordStockOpname(
  formData: FormData
): Promise<ActionResult> {
  const counts: { materialId: string; counted: FormDataEntryValue }[] = [];

  for (const [key, value] of formData.entries()) {
    // Blank means "not counted this round", which is not the same as zero.
    if (!key.startsWith(OPNAME_PREFIX) || value === "") continue;
    counts.push({ materialId: key.slice(OPNAME_PREFIX.length), counted: value });
  }

  const parsed = stockOpnameSchema.safeParse({
    actorId: formData.get("actorId") ?? "",
    note: formData.get("note") ?? "",
    counts,
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { actorId, note, counts: rows } = parsed.data;

  const materials = await prisma.material.findMany({
    where: { id: { in: rows.map((row) => row.materialId) } },
    select: { id: true, stock: true },
  });

  const recorded = new Map(materials.map((m) => [m.id, m.stock]));

  const corrections = rows.flatMap((row) => {
    const before = recorded.get(row.materialId);
    if (before === undefined || before === row.counted) return [];
    return [{ ...row, delta: row.counted - before }];
  });

  // Written even when every row matched. An opname that found nothing still
  // happened, and without this the tidiest counts are the ones that leave no
  // evidence — so "terakhir kita hitung kapan" would have no answer.
  const opname = await prisma.stockOpname.create({
    data: {
      checked: rows.length,
      corrected: corrections.length,
      note: note ? note : null,
      actorId: actorId ? actorId : null,
    },
    select: { id: true },
  });

  if (corrections.length === 0) {
    revalidatePath("/inventory");
    return { ok: true, message: "Semua cocok, tidak ada yang dikoreksi." };
  }

  await prisma.$transaction(
    corrections.flatMap((row) => [
      prisma.material.update({
        where: { id: row.materialId },
        data: { stock: row.counted },
      }),
      prisma.stockMovement.create({
        data: {
          materialId: row.materialId,
          delta: row.delta,
          reason: "CORRECTION",
          opnameId: opname.id,
          note: note ? `Opname: ${note}` : "Opname stok",
          actorId: actorId ? actorId : null,
        },
      }),
    ])
  );

  revalidatePath("/inventory");
  revalidatePath("/health/racikan");
  return { ok: true, message: `${corrections.length} bahan dikoreksi.` };
}

export async function createTool(formData: FormData): Promise<ActionResult> {
  const parsed = createToolSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    condition: formData.get("condition"),
    lastServicedAt: formData.get("lastServicedAt") || undefined,
    serviceIntervalDays: formData.get("serviceIntervalDays") || undefined,
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { notes, ...rest } = parsed.data;

  await prisma.tool.create({
    data: { ...rest, notes: notes ? notes : null },
  });

  revalidatePath("/inventory");
  return { ok: true };
}

export async function updateTool(formData: FormData): Promise<ActionResult> {
  const parsed = updateToolSchema.safeParse({
    toolId: formData.get("toolId"),
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    condition: formData.get("condition"),
    lastServicedAt: formData.get("lastServicedAt") || undefined,
    serviceIntervalDays: formData.get("serviceIntervalDays") || undefined,
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { toolId, notes, ...rest } = parsed.data;

  const result = await prisma.tool.updateMany({
    where: { id: toolId },
    data: { ...rest, notes: notes ? notes : null },
  });

  if (result.count === 0) {
    return { ok: false, message: "Alat tidak ditemukan." };
  }

  revalidatePath("/inventory");
  return { ok: true };
}

export async function deleteTool(formData: FormData): Promise<ActionResult> {
  const toolId = String(formData.get("toolId") ?? "");
  if (!toolId) return { ok: false, message: "Alat tidak dikenali." };

  const result = await prisma.tool.deleteMany({ where: { id: toolId } });

  if (result.count === 0) {
    return { ok: false, message: "Alat tidak ditemukan." };
  }

  revalidatePath("/inventory");
  return { ok: true };
}

/**
 * Records what happened to a tool and applies its effect. Losing one of three
 * hoes should leave two, not mark the whole row lost — and six months later
 * the log is the only thing that can say where the third went.
 */
export async function recordToolEvent(
  formData: FormData
): Promise<ActionResult> {
  const parsed = recordToolEventSchema.safeParse({
    toolId: formData.get("toolId"),
    type: formData.get("type"),
    quantity: formData.get("quantity") ?? 1,
    totalCost: formData.get("totalCost") || undefined,
    note: formData.get("note") ?? "",
    actorId: formData.get("actorId") ?? "",
    holderId: formData.get("holderId") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { toolId, type, quantity, totalCost, note, actorId, holderId } =
    parsed.data;

  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    select: { quantity: true, name: true },
  });

  if (!tool) return { ok: false, message: "Alat tidak ditemukan." };

  const removing = type === "LOST" || type === "RETIRED";

  if (removing && quantity > tool.quantity) {
    return {
      ok: false,
      message: `${tool.name} hanya ada ${tool.quantity}. Tidak bisa mengurangi ${quantity}.`,
      fieldErrors: { quantity: "Melebihi jumlah yang ada" },
    };
  }

  const data: {
    quantity?: { increment: number } | { decrement: number };
    condition?: "GOOD" | "NEEDS_SERVICE" | "BROKEN";
    lastServicedAt?: Date;
    notes?: string | null;
    heldById?: string | null;
  } = {};

  if (type === "ACQUIRED") data.quantity = { increment: quantity };
  if (removing) data.quantity = { decrement: quantity };

  if (type === "DAMAGED") {
    data.condition = "NEEDS_SERVICE";
    // What is wrong with it is the one thing worth carrying to the repair
    // shop, so it becomes the tool's own note rather than staying buried in
    // the event log the shopping list never reads.
    if (note) data.notes = note;
  }

  // Who is carrying it, not how many we own — a borrowed hoe is still ours.
  if (type === "CHECKED_OUT") data.heldById = holderId ? holderId : null;
  if (type === "RETURNED") data.heldById = null;

  if (type === "SERVICED") {
    data.condition = "GOOD";
    data.lastServicedAt = new Date();
    // The fault is fixed; leaving its description behind would send someone
    // back to the shop for a repair already done.
    data.notes = note ? note : null;
  }

  await prisma.$transaction([
    prisma.tool.update({ where: { id: toolId }, data }),
    prisma.toolEvent.create({
      data: {
        toolId,
        type,
        quantity: changesQuantity(type) ? quantity : 1,
        // Only buying one and paying to fix one cost anything; losing a hoe
        // is a loss but not a payment.
        totalCost:
          type === "ACQUIRED" || type === "SERVICED" ? (totalCost ?? null) : null,
        note: note ? note : null,
        actorId: actorId ? actorId : null,
      },
    }),
  ]);

  revalidatePath("/inventory");
  revalidatePath("/finance");
  return { ok: true };
}

export async function createShoppingNote(
  formData: FormData
): Promise<ActionResult> {
  const parsed = createShoppingNoteSchema.safeParse({
    text: formData.get("text"),
    actorId: formData.get("actorId") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { text, actorId } = parsed.data;

  await prisma.shoppingNote.create({
    data: { text, actorId: actorId ? actorId : null },
  });

  revalidatePath("/inventory");
  return { ok: true };
}

export async function toggleShoppingNote(
  formData: FormData
): Promise<ActionResult> {
  const parsed = toggleShoppingNoteSchema.safeParse({
    noteId: formData.get("noteId"),
    done: formData.get("done"),
  });

  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };

  const done = parsed.data.done === "true";

  const result = await prisma.shoppingNote.updateMany({
    where: { id: parsed.data.noteId },
    data: { done, completedAt: done ? new Date() : null },
  });

  if (result.count === 0) {
    return { ok: false, message: "Catatan tidak ditemukan." };
  }

  revalidatePath("/inventory");
  return { ok: true };
}

export async function deleteShoppingNote(
  formData: FormData
): Promise<ActionResult> {
  const noteId = String(formData.get("noteId") ?? "");
  if (!noteId) return { ok: false, message: "Catatan tidak dikenali." };

  await prisma.shoppingNote.deleteMany({ where: { id: noteId } });

  revalidatePath("/inventory");
  return { ok: true };
}

/** Clears everything already ticked off, after a trip to town. */
export async function clearDoneShoppingNotes(): Promise<ActionResult> {
  await prisma.shoppingNote.deleteMany({ where: { done: true } });

  revalidatePath("/inventory");
  return { ok: true };
}
