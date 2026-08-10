"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import {
  adjustStockSchema,
  createToolSchema,
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
