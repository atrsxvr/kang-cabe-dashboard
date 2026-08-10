"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import {
  adjustStockSchema,
  changesQuantity,
  createShoppingNoteSchema,
  createToolSchema,
  recordToolEventSchema,
  toggleShoppingNoteSchema,
  updateToolSchema,
} from "@/server/actions/schemas";

/**
 * Stock and the movement that caused it are written together. A number that
 * changed with no record of why is exactly what this module exists to stop.
 */
export async function adjustStock(formData: FormData): Promise<ActionResult> {
  const parsed = adjustStockSchema.safeParse({
    materialId: formData.get("materialId"),
    delta: formData.get("delta"),
    reason: formData.get("reason"),
    note: formData.get("note") ?? "",
    actorId: formData.get("actorId") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { materialId, delta, reason, note, actorId } = parsed.data;

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { stock: true, name: true },
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
      data: { stock: { increment: delta } },
    }),
    prisma.stockMovement.create({
      data: {
        materialId,
        delta,
        reason,
        note: note ? note : null,
        actorId: actorId ? actorId : null,
      },
    }),
  ]);

  revalidatePath("/inventory");
  revalidatePath("/health/racikan");
  return { ok: true };
}

export async function createTool(formData: FormData): Promise<ActionResult> {
  const parsed = createToolSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    condition: formData.get("condition"),
    lastServicedAt: formData.get("lastServicedAt") || undefined,
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
    note: formData.get("note") ?? "",
    actorId: formData.get("actorId") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { toolId, type, quantity, note, actorId } = parsed.data;

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
        note: note ? note : null,
        actorId: actorId ? actorId : null,
      },
    }),
  ]);

  revalidatePath("/inventory");
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
