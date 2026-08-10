"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import {
  createMaterialSchema,
  createRecipeSchema,
  updateMaterialSchema,
  updateRecipeSchema,
} from "@/server/actions/schemas";

export async function createMaterial(
  formData: FormData
): Promise<ActionResult> {
  const parsed = createMaterialSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    stock: formData.get("stock") ?? 0,
    minStock: formData.get("minStock") ?? 0,
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const { notes, ...rest } = parsed.data;

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

  await prisma.material.create({
    data: { ...rest, notes: notes ? notes : null },
  });

  revalidatePath("/health/racikan");
  revalidatePath("/inventory");
  return { ok: true };
}

export async function createRecipe(formData: FormData): Promise<ActionResult> {
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
  const parsed = updateMaterialSchema.safeParse({
    materialId: formData.get("materialId"),
    name: formData.get("name"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    stock: formData.get("stock") ?? 0,
    minStock: formData.get("minStock") ?? 0,
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { materialId, notes, ...rest } = parsed.data;

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
    data: { ...rest, notes: notes ? notes : null },
  });

  if (result.count === 0) {
    return { ok: false, message: "Bahan tidak ditemukan." };
  }

  revalidatePath("/health/racikan");
  revalidatePath("/inventory");
  return { ok: true };
}

export async function deleteMaterial(
  formData: FormData
): Promise<ActionResult> {
  const materialId = String(formData.get("materialId") ?? "");
  if (!materialId) return { ok: false, message: "Bahan tidak dikenali." };

  // The database would refuse this anyway through onDelete: Restrict, but a
  // raw constraint error tells the user nothing about which recipes to fix.
  const usedBy = await prisma.recipeItem.findMany({
    where: { materialId },
    select: { recipe: { select: { name: true } } },
    take: 3,
  });

  if (usedBy.length > 0) {
    const names = usedBy.map((item) => item.recipe.name).join(", ");
    return {
      ok: false,
      message: `Bahan ini masih dipakai racikan: ${names}. Hapus dari racikan itu dulu.`,
    };
  }

  const result = await prisma.material.deleteMany({ where: { id: materialId } });

  if (result.count === 0) {
    return { ok: false, message: "Bahan tidak ditemukan." };
  }

  revalidatePath("/health/racikan");
  revalidatePath("/inventory");
  return { ok: true };
}
