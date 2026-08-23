"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";
import {
  createSeasonSchema,
  nextSeasonStatus,
  seasonStatuses,
  updateSeasonSchema,
} from "@/server/actions/schemas";

export async function createSeason(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("seasons");
  if (!allowed.ok) return allowed;

  const parsed = createSeasonSchema.safeParse({
    name: formData.get("name"),
    variety: formData.get("variety"),
    plantCount: formData.get("plantCount"),
    projectedHarvestKg: formData.get("projectedHarvestKg"),
    startDate: formData.get("startDate"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const { notes, ...rest } = parsed.data;

  const season = await prisma.season.create({
    data: { ...rest, notes: notes ? notes : null },
  });

  // The selector lives in the layout, so the whole tree needs revalidating for
  // a new season to appear in it.
  revalidatePath("/", "layout");

  return { ok: true, seasonId: season.id };
}

export async function advanceSeasonStatus(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("seasons");
  if (!allowed.ok) return allowed;

  const seasonId = String(formData.get("seasonId") ?? "");
  if (!seasonId) return { ok: false, message: "Musim tidak dikenali." };

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { status: true },
  });

  if (!season) return { ok: false, message: "Musim tidak ditemukan." };

  const next = nextSeasonStatus(season.status);
  if (!next) {
    return { ok: false, message: "Musim sudah pada tahap terakhir." };
  }

  await prisma.season.update({
    where: { id: seasonId },
    // COMPLETED closes the season, so stamp when it ended.
    data: { status: next, endDate: next === "COMPLETED" ? new Date() : null },
  });

  revalidatePath("/", "layout");
  return { ok: true, seasonId };
}

export async function setSeasonStatus(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("seasons");
  if (!allowed.ok) return allowed;

  const seasonId = String(formData.get("seasonId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!seasonId) return { ok: false, message: "Musim tidak dikenali." };
  if (!seasonStatuses.includes(status as (typeof seasonStatuses)[number])) {
    return { ok: false, message: "Status tidak dikenali." };
  }

  await prisma.season.update({
    where: { id: seasonId },
    data: {
      status: status as (typeof seasonStatuses)[number],
      endDate: status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, seasonId };
}

export async function updateSeason(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("seasons");
  if (!allowed.ok) return allowed;

  const parsed = updateSeasonSchema.safeParse({
    seasonId: formData.get("seasonId"),
    name: formData.get("name"),
    variety: formData.get("variety"),
    plantCount: formData.get("plantCount"),
    projectedHarvestKg: formData.get("projectedHarvestKg"),
    startDate: formData.get("startDate"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { seasonId, notes, ...rest } = parsed.data;

  const result = await prisma.season.updateMany({
    where: { id: seasonId },
    data: {
      ...rest,
      notes: notes ? notes : null,
      // Reaching COMPLETED stamps the end; moving back off it clears the stamp
      // rather than leaving a season "ended" while it is running again.
      endDate: rest.status === "COMPLETED" ? new Date() : null,
    },
  });

  if (result.count === 0) {
    return { ok: false, message: "Musim tidak ditemukan." };
  }

  // The selector lives in the layout, so a renamed season needs the whole tree.
  revalidatePath("/", "layout");
  return { ok: true, seasonId };
}

/**
 * Archive rather than delete. A season cascades to every task, finding,
 * harvest and transaction beneath it, and with no authentication in place a
 * delete button is a single click between a stranger and the entire record.
 * ARCHIVED has been in the schema since the start with no way to reach it.
 */
export async function archiveSeason(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("seasons");
  if (!allowed.ok) return allowed;

  const seasonId = String(formData.get("seasonId") ?? "");
  if (!seasonId) return { ok: false, message: "Musim tidak dikenali." };

  const result = await prisma.season.updateMany({
    where: { id: seasonId },
    data: { status: "ARCHIVED" },
  });

  if (result.count === 0) {
    return { ok: false, message: "Musim tidak ditemukan." };
  }

  revalidatePath("/", "layout");
  return { ok: true, seasonId };
}
