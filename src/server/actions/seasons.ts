"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  createSeasonSchema,
  nextSeasonStatus,
  seasonStatuses,
} from "@/server/actions/schemas";

export type ActionResult =
  | { ok: true; seasonId?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

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

export async function createSeason(formData: FormData): Promise<ActionResult> {
  const parsed = createSeasonSchema.safeParse({
    name: formData.get("name"),
    variety: formData.get("variety"),
    plantCount: formData.get("plantCount"),
    startDate: formData.get("startDate"),
    status: formData.get("status"),
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
