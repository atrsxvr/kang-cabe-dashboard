"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/server/actions/seasons";
import {
  createMaterialSchema,
  createRecipeSchema,
} from "@/server/actions/schemas";

function fieldErrorsOf(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createMaterial(
  formData: FormData
): Promise<ActionResult> {
  const parsed = createMaterialSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali isian formulir.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
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
    return {
      ok: false,
      message: "Periksa kembali isian formulir.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
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
