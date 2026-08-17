"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isDosable } from "@/lib/stock";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";
import {
  createMaterialSchema,
  createRecipeSchema,
  updateMaterialSchema,
  updateRecipeSchema,
} from "@/server/actions/schemas";


/**
 * The form only offers materials a tank can take, but the form is not the only
 * way in. A recipe line for bamboo stakes would be a dose per litre of
 * something that does not dissolve, and nothing downstream could catch it.
 */
async function rejectUndosable(
  items: { materialId: string }[]
): Promise<string | null> {
  const materials = await prisma.material.findMany({
    where: { id: { in: items.map((item) => item.materialId) } },
    select: { name: true, category: true },
  });

  const bad = materials.find((material) => !isDosable(material.category));

  return bad
    ? `${bad.name} tidak bisa ditakar per liter, jadi tidak bisa masuk racikan.`
    : null;
}

export async function createMaterial(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("materials");
  if (!allowed.ok) return allowed;

  const parsed = createMaterialSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    stock: formData.get("stock") ?? 0,
    minStock: formData.get("minStock") ?? 0,
    notes: formData.get("notes") ?? "",
    purchaseUnit: formData.get("purchaseUnit") ?? "",
    purchaseSize: formData.get("purchaseSize") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    openingCost: formData.get("openingCost") || undefined,
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const { notes, openingCost, purchaseUnit, purchaseSize, expiresAt, ...rest } =
    parsed.data;

  const existing = await prisma.material.findUnique({
    where: { name: rest.name },
    select: { id: true },
  });

  if (existing) {
    return {
      ok: false,
      message: `Bahan "${rest.name}" sudah ada.`,
      fieldErrors: { name: "Nama bahan sudah dipakai" },
    };
  }

  const material = await prisma.material.create({
    data: {
      ...rest,
      notes: notes ? notes : null,
      purchaseUnit: purchaseUnit ? purchaseUnit : null,
      purchaseSize: purchaseSize ?? null,
      expiresAt: expiresAt ?? null,
      // First arrival, so there is nothing to average against — the opening
      // value simply is the price.
      avgCost:
        openingCost !== undefined && rest.stock > 0
          ? openingCost / rest.stock
          : 0,
    },
  });

  // The number typed on registration is a physical count like any other, so it
  // gets a movement too. Without it the history starts mid-story and the
  // oldest rows never add up to the stock on hand.
  if (material.stock > 0) {
    await prisma.stockMovement.create({
      data: {
        materialId: material.id,
        delta: material.stock,
        reason: "CORRECTION",
        totalCost: openingCost ?? null,
        note: "Saldo awal saat bahan didaftarkan",
      },
    });
  }

  revalidatePath("/health/racikan");
  revalidatePath("/inventory");
  return { ok: true };
}

export async function createRecipe(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("recipes");
  if (!allowed.ok) return allowed;

  // Ingredient rows arrive as parallel arrays from the dynamic form.
  const materialIds = formData.getAll("materialId").map(String);
  const amounts = formData.getAll("amountPerLiter").map(String);

  const items = materialIds
    .map((materialId, index) => ({
      materialId,
      amountPerLiter: amounts[index] ?? "",
    }))
    .filter((item) => item.materialId && item.amountPerLiter !== "");

  const kind = String(formData.get("kind") ?? "ROUTINE");

  const parsed = createRecipeSchema.safeParse({
    name: formData.get("name"),
    kind,
    method: formData.get("method"),
    // Blank means "not applicable" for the other kind; undefined lets the
    // refinements report a missing required field rather than an enum error.
    phase: formData.get("phase") || undefined,
    targetIssue: formData.get("targetIssue") ?? "",
    intervalDays: formData.get("intervalDays") || undefined,
    basisVolumeL: formData.get("basisVolumeL"),
    preHarvestIntervalDays:
      formData.get("preHarvestIntervalDays") || undefined,
    notes: formData.get("notes") ?? "",
    items,
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const {
    items: parsedItems,
    notes,
    targetIssue,
    phase,
    ...rest
  } = parsed.data;

  const undosable = await rejectUndosable(parsedItems);
  if (undosable) return { ok: false, message: undosable };

  await prisma.recipe.create({
    data: {
      ...rest,
      // Keep the unused half of the pair empty rather than carrying a stale
      // phase on a treatment recipe.
      phase: rest.kind === "ROUTINE" ? phase : null,
      targetIssue: rest.kind === "TREATMENT" ? (targetIssue ?? null) : null,
      notes: notes ? notes : null,
      items: { create: parsedItems },
    },
  });

  revalidatePath("/health/racikan");
  revalidatePath("/health");
  return { ok: true };
}

export async function deleteRecipe(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("recipes");
  if (!allowed.ok) return allowed;

  const recipeId = String(formData.get("recipeId") ?? "");
  if (!recipeId) return { ok: false, message: "Racikan tidak dikenali." };

  const result = await prisma.recipe.deleteMany({ where: { id: recipeId } });

  if (result.count === 0) {
    return { ok: false, message: "Racikan tidak ditemukan." };
  }

  revalidatePath("/health/racikan");
  return { ok: true };
}

export async function updateRecipe(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("recipes");
  if (!allowed.ok) return allowed;

  const materialIds = formData.getAll("materialId").map(String);
  const amounts = formData.getAll("amountPerLiter").map(String);

  const items = materialIds
    .map((materialId, index) => ({
      materialId,
      amountPerLiter: amounts[index] ?? "",
    }))
    .filter((item) => item.materialId && item.amountPerLiter !== "");

  const parsed = updateRecipeSchema.safeParse({
    recipeId: formData.get("recipeId"),
    name: formData.get("name"),
    kind: String(formData.get("kind") ?? "ROUTINE"),
    method: formData.get("method"),
    phase: formData.get("phase") || undefined,
    targetIssue: formData.get("targetIssue") ?? "",
    intervalDays: formData.get("intervalDays") || undefined,
    basisVolumeL: formData.get("basisVolumeL"),
    preHarvestIntervalDays: formData.get("preHarvestIntervalDays") || undefined,
    notes: formData.get("notes") ?? "",
    items,
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const {
    recipeId,
    items: parsedItems,
    notes,
    targetIssue,
    phase,
    ...rest
  } = parsed.data;

  const existing = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { id: true },
  });

  if (!existing) return { ok: false, message: "Racikan tidak ditemukan." };

  const undosable = await rejectUndosable(parsedItems);
  if (undosable) return { ok: false, message: undosable };

  await prisma.$transaction([
    prisma.recipe.update({
      where: { id: recipeId },
      data: {
        ...rest,
        phase: rest.kind === "ROUTINE" ? phase : null,
        targetIssue: rest.kind === "TREATMENT" ? (targetIssue ?? null) : null,
        notes: notes ? notes : null,
      },
    }),
    prisma.recipeItem.deleteMany({ where: { recipeId } }),
    prisma.recipeItem.createMany({
      data: parsedItems.map((item) => ({ ...item, recipeId })),
    }),
  ]);

  // Treatments already written into a finding keep their copied amounts — that
  // is the point of copying rather than linking.
  revalidatePath("/health/racikan");
  revalidatePath("/health");
  return { ok: true };
}

export async function updateMaterial(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("materials");
  if (!allowed.ok) return allowed;

  const parsed = updateMaterialSchema.safeParse({
    materialId: formData.get("materialId"),
    name: formData.get("name"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    minStock: formData.get("minStock") ?? 0,
    notes: formData.get("notes") ?? "",
    purchaseUnit: formData.get("purchaseUnit") ?? "",
    purchaseSize: formData.get("purchaseSize") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { materialId, notes, purchaseUnit, purchaseSize, expiresAt, ...rest } =
    parsed.data;

  const clash = await prisma.material.findFirst({
    where: { name: rest.name, id: { not: materialId } },
    select: { id: true },
  });

  if (clash) {
    return {
      ok: false,
      message: `Bahan "${rest.name}" sudah ada.`,
      fieldErrors: { name: "Nama bahan sudah dipakai" },
    };
  }

  const result = await prisma.material.updateMany({
    where: { id: materialId },
    data: {
      ...rest,
      notes: notes ? notes : null,
      purchaseUnit: purchaseUnit ? purchaseUnit : null,
      purchaseSize: purchaseSize ?? null,
      expiresAt: expiresAt ?? null,
    },
  });

  if (result.count === 0) {
    return { ok: false, message: "Bahan tidak ditemukan." };
  }

  revalidatePath("/health/racikan");
  revalidatePath("/inventory");
  return { ok: true };
}
