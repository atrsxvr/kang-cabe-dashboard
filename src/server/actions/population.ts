"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { revalidateSeasonMoney } from "@/server/actions/revalidate";
import {
  createHarvestLossSchema,
  createPlantEventSchema,
  updatePlantEventSchema,
} from "@/server/actions/schemas";

/**
 * Two ledgers that keep the headline numbers honest: how many plants are still
 * standing, and how much of the pick never made it to a buyer.
 *
 * Both are append-and-correct logs rather than figures to overwrite — the same
 * shape as stock movements, and for the same reason: the reading matters less
 * than the reason behind it.
 */

function revalidate() {
  revalidatePath("/health");
  revalidateSeasonMoney();
}

export async function createPlantEvent(
  formData: FormData
): Promise<ActionResult> {
  const parsed = createPlantEventSchema.safeParse({
    seasonId: formData.get("seasonId"),
    eventDate: formData.get("eventDate"),
    type: formData.get("type"),
    count: formData.get("count"),
    cause: formData.get("cause") ?? "",
    findingId: formData.get("findingId") ?? "",
    note: formData.get("note") ?? "",
    recordedById: formData.get("recordedById") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { seasonId, cause, findingId, note, recordedById, ...rest } =
    parsed.data;

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true },
  });

  if (!season) return { ok: false, message: "Musim tidak ditemukan." };

  await prisma.plantEvent.create({
    data: {
      ...rest,
      seasonId,
      cause: cause ? cause : null,
      // Only a finding from this same season may explain it; anything else
      // would let one planting's diagnosis account for another's losses.
      findingId: findingId ? findingId : null,
      note: note ? note : null,
      recordedById: recordedById ? recordedById : null,
    },
  });

  revalidate();
  return { ok: true };
}

export async function updatePlantEvent(
  formData: FormData
): Promise<ActionResult> {
  const parsed = updatePlantEventSchema.safeParse({
    eventId: formData.get("eventId"),
    seasonId: formData.get("seasonId"),
    eventDate: formData.get("eventDate"),
    type: formData.get("type"),
    count: formData.get("count"),
    cause: formData.get("cause") ?? "",
    findingId: formData.get("findingId") ?? "",
    note: formData.get("note") ?? "",
    recordedById: formData.get("recordedById") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { eventId, seasonId, cause, findingId, note, recordedById, ...rest } =
    parsed.data;

  const result = await prisma.plantEvent.updateMany({
    where: { id: eventId, seasonId },
    data: {
      ...rest,
      cause: cause ? cause : null,
      findingId: findingId ? findingId : null,
      note: note ? note : null,
      recordedById: recordedById ? recordedById : null,
    },
  });

  if (result.count === 0) {
    return { ok: false, message: "Catatan tidak ditemukan pada musim ini." };
  }

  revalidate();
  return { ok: true };
}

export async function deletePlantEvent(
  formData: FormData
): Promise<ActionResult> {
  const eventId = String(formData.get("eventId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");

  if (!eventId || !seasonId) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  const result = await prisma.plantEvent.deleteMany({
    where: { id: eventId, seasonId },
  });

  if (result.count === 0) {
    return { ok: false, message: "Catatan tidak ditemukan pada musim ini." };
  }

  revalidate();
  return { ok: true };
}

export async function createHarvestLoss(
  formData: FormData
): Promise<ActionResult> {
  const parsed = createHarvestLossSchema.safeParse({
    seasonId: formData.get("seasonId"),
    lostAt: formData.get("lostAt"),
    grade: formData.get("grade"),
    weightKg: formData.get("weightKg"),
    reason: formData.get("reason") ?? "",
    note: formData.get("note") ?? "",
    recordedById: formData.get("recordedById") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { seasonId, reason, note, recordedById, ...rest } = parsed.data;

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true },
  });

  if (!season) return { ok: false, message: "Musim tidak ditemukan." };

  await prisma.harvestLoss.create({
    data: {
      ...rest,
      seasonId,
      reason: reason ? reason : null,
      note: note ? note : null,
      recordedById: recordedById ? recordedById : null,
    },
  });

  revalidate();
  return { ok: true };
}

export async function deleteHarvestLoss(
  formData: FormData
): Promise<ActionResult> {
  const lossId = String(formData.get("lossId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");

  if (!lossId || !seasonId) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  const result = await prisma.harvestLoss.deleteMany({
    where: { id: lossId, seasonId },
  });

  if (result.count === 0) {
    return { ok: false, message: "Catatan tidak ditemukan pada musim ini." };
  }

  revalidate();
  return { ok: true };
}
