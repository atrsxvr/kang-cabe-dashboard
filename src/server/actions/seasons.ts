"use server";

import { revalidatePath } from "next/cache";

import { formatKg } from "@/lib/harvest";
import { formatRupiah } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  canCloseSeason,
  closingChecklist,
  type ClosingCheck,
} from "@/lib/season-close";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { currentActor, guardWrite } from "@/server/auth/guard";
import { closingFacts } from "@/server/queries/season-close";
import {
  createSeasonSchema,
  nextSeasonStatus,
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

  // Selesai is when the margin is split, and the owner's rule is that it
  // happens only once everything is settled. Checked here, not just by a
  // disabled button: a Server Action can be called without its page.
  if (next === "COMPLETED") {
    const checks = closingChecklist(await closingFacts(seasonId), seasonId, {
      rupiah: formatRupiah,
      kg: formatKg,
    });
    if (!canCloseSeason(checks)) {
      const pending = checks.filter((check) => !check.ok);
      return {
        ok: false,
        message: `Musim belum bisa ditutup — ${pending.length} hal belum beres: ${pending
          .map((check) => check.title)
          .join("; ")}.`,
      };
    }
  }

  await prisma.season.update({
    where: { id: seasonId },
    // COMPLETED closes the season, so stamp when it ended.
    data: { status: next, endDate: next === "COMPLETED" ? new Date() : null },
  });

  revalidatePath("/", "layout");
  return { ok: true, seasonId };
}

/**
 * The closing checklist for one season, fetched when its dialog opens.
 *
 * Read-only, and open to anyone signed in, like every read in this app — but
 * a Server Action is a public endpoint, so it still checks there is a live
 * session before touching the books.
 */
export async function getClosingChecklist(
  seasonId: string
): Promise<ClosingCheck[] | null> {
  if (!seasonId || !(await currentActor())) return null;

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true },
  });
  if (!season) return null;

  return closingChecklist(await closingFacts(seasonId), seasonId, {
    rupiah: formatRupiah,
    kg: formatKg,
  });
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
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { seasonId, notes, ...rest } = parsed.data;

  // Neither the status nor the end date: both belong to closing. Writing the
  // end date here used to restamp a closed season as ending "today" every
  // time its name or notes were corrected.
  const result = await prisma.season.updateMany({
    where: { id: seasonId },
    data: {
      ...rest,
      notes: notes ? notes : null,
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
