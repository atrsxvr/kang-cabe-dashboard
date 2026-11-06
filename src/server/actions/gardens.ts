"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { gardenSchema } from "@/server/actions/schemas";
import { guardWrite } from "@/server/auth/guard";

/** Lahan: where each season is planted. Admin's, like the rest of Settings. */

function revalidate() {
  revalidatePath("/", "layout");
}

function fields(formData: FormData) {
  return {
    name: formData.get("name"),
    locationName: formData.get("locationName") ?? "",
    bmkgAdm4: formData.get("bmkgAdm4") ?? "",
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
  };
}

function toData(parsed: z.infer<typeof gardenSchema>) {
  return {
    name: parsed.name,
    locationName: parsed.locationName ? parsed.locationName : null,
    bmkgAdm4: parsed.bmkgAdm4 ? parsed.bmkgAdm4 : null,
    latitude: parsed.latitude ?? null,
    longitude: parsed.longitude ?? null,
  };
}

export async function createGarden(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("settings");
  if (!allowed.ok) return allowed;

  const parsed = gardenSchema.safeParse(fields(formData));
  if (!parsed.success) return invalidForm(parsed.error);

  await prisma.garden.create({ data: toData(parsed.data) });
  revalidate();
  return { ok: true };
}

export async function updateGarden(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("settings");
  if (!allowed.ok) return allowed;

  const parsed = gardenSchema
    .extend({ gardenId: z.string().min(1) })
    .safeParse({ ...fields(formData), gardenId: formData.get("gardenId") });
  if (!parsed.success) return invalidForm(parsed.error);

  const result = await prisma.garden.updateMany({
    where: { id: parsed.data.gardenId },
    data: toData(parsed.data),
  });
  if (result.count === 0) return { ok: false, message: "Lahan tidak ditemukan." };

  revalidate();
  return { ok: true };
}

/**
 * Only a plot no season has used. Once planted, its name is part of that
 * season's report; a typo is fixed with Edit instead.
 */
export async function deleteGarden(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("settings");
  if (!allowed.ok) return allowed;

  const gardenId = String(formData.get("gardenId") ?? "");
  const seasons = await prisma.season.count({ where: { gardenId } });
  if (seasons > 0) {
    return {
      ok: false,
      message: `Lahan ini dipakai ${seasons} musim, jadi tidak bisa dihapus. Ubah namanya saja kalau keliru.`,
    };
  }

  const result = await prisma.garden.deleteMany({ where: { id: gardenId } });
  if (result.count === 0) return { ok: false, message: "Lahan tidak ditemukan." };

  revalidate();
  return { ok: true };
}
