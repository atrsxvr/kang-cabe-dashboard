"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";
import {
  canAdvanceFinding,
  createFindingSchema,
  diagnoseFindingSchema,
  updateFindingSchema,
  updateFindingStatusSchema,
} from "@/server/actions/schemas";
import { deleteFindingPhoto, uploadFindingPhoto } from "@/server/storage";

export async function createFinding(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("findings");
  if (!allowed.ok) return allowed;

  // Validate before uploading. Uploading first left a file in the bucket every
  // time the form came back with an error — storage filling up with photos
  // belonging to findings that were never saved.
  const parsed = createFindingSchema.safeParse({
    seasonId: formData.get("seasonId"),
    hst: formData.get("hst"),
    symptoms: formData.get("symptoms"),
    severity: formData.get("severity"),
    location: formData.get("location") ?? "",
    reportedById: formData.get("reportedById") ?? "",
    photoUrl: "",
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const { seasonId, location, reportedById, ...rest } = parsed.data;

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true },
  });

  if (!season) return { ok: false, message: "Musim tidak ditemukan." };

  const photo = formData.get("photo");
  let photoUrl: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadFindingPhoto(photo);
    if (!uploaded.ok) return { ok: false, message: uploaded.message };
    photoUrl = uploaded.url;
  }

  await prisma.healthLog.create({
    data: {
      ...rest,
      seasonId,
      photoUrl,
      location: location ? location : null,
      reportedById: reportedById ? reportedById : null,
    },
  });

  revalidatePath("/health");
  return { ok: true };
}

export async function diagnoseFinding(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("diagnosis");
  if (!allowed.ok) return allowed;

  const parsed = diagnoseFindingSchema.safeParse({
    findingId: formData.get("findingId"),
    seasonId: formData.get("seasonId"),
    diagnosis: formData.get("diagnosis"),
    treatment: formData.get("treatment"),
    diagnosedById: formData.get("diagnosedById") ?? "",
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const { findingId, seasonId, diagnosedById, ...rest } = parsed.data;

  const result = await prisma.healthLog.updateMany({
    where: { id: findingId, seasonId },
    data: {
      ...rest,
      diagnosedById: diagnosedById ? diagnosedById : null,
      diagnosedAt: new Date(),
      status: "DIAGNOSED",
    },
  });

  if (result.count === 0) {
    return { ok: false, message: "Temuan tidak ditemukan pada musim ini." };
  }

  revalidatePath("/health");
  return { ok: true };
}

export async function updateFindingStatus(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("findings");
  if (!allowed.ok) return allowed;

  const parsed = updateFindingStatusSchema.safeParse({
    findingId: formData.get("findingId"),
    seasonId: formData.get("seasonId"),
    status: formData.get("status"),
  });

  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };

  const { findingId, seasonId, status } = parsed.data;

  const finding = await prisma.healthLog.findFirst({
    where: { id: findingId, seasonId },
    select: { status: true },
  });

  if (!finding) {
    return { ok: false, message: "Temuan tidak ditemukan pada musim ini." };
  }

  if (!canAdvanceFinding(finding.status, status)) {
    return {
      ok: false,
      message:
        finding.status === "REPORTED"
          ? "Temuan harus didiagnosa lebih dulu."
          : "Perubahan status itu tidak diizinkan.",
    };
  }

  await prisma.healthLog.updateMany({
    where: { id: findingId, seasonId },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });

  revalidatePath("/health");
  return { ok: true };
}

export async function updateFinding(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("findings");
  if (!allowed.ok) return allowed;

  const parsed = updateFindingSchema.safeParse({
    findingId: formData.get("findingId"),
    seasonId: formData.get("seasonId"),
    hst: formData.get("hst"),
    symptoms: formData.get("symptoms"),
    severity: formData.get("severity"),
    location: formData.get("location") ?? "",
    reportedById: formData.get("reportedById") ?? "",
    photoUrl: "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { findingId, seasonId, location, reportedById, ...rest } = parsed.data;

  const existing = await prisma.healthLog.findFirst({
    where: { id: findingId, seasonId },
    select: { photoUrl: true },
  });

  if (!existing) {
    return { ok: false, message: "Temuan tidak ditemukan pada musim ini." };
  }

  // Only touch the photo when a new one is supplied. Submitting the form with
  // the file input untouched must not wipe the picture already attached.
  const photo = formData.get("photo");
  let photoUrl = existing.photoUrl;

  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadFindingPhoto(photo);
    if (!uploaded.ok) return { ok: false, message: uploaded.message };
    photoUrl = uploaded.url;

    // The replaced file has nothing pointing at it any more.
    if (existing.photoUrl) await deleteFindingPhoto(existing.photoUrl);
  }

  await prisma.healthLog.updateMany({
    where: { id: findingId, seasonId },
    data: {
      ...rest,
      photoUrl,
      location: location ? location : null,
      reportedById: reportedById ? reportedById : null,
    },
  });

  revalidatePath("/health");
  return { ok: true };
}

export async function deleteFinding(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("findings");
  if (!allowed.ok) return allowed;

  const findingId = String(formData.get("findingId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");

  if (!findingId || !seasonId) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  const existing = await prisma.healthLog.findFirst({
    where: { id: findingId, seasonId },
    select: { photoUrl: true },
  });

  if (!existing) {
    return { ok: false, message: "Temuan tidak ditemukan pada musim ini." };
  }

  await prisma.healthLog.deleteMany({ where: { id: findingId, seasonId } });

  // After the row, so a storage failure cannot leave a finding that the UI
  // shows but whose photo is already gone.
  if (existing.photoUrl) await deleteFindingPhoto(existing.photoUrl);

  revalidatePath("/health");
  return { ok: true };
}
