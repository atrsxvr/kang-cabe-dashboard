"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/server/actions/seasons";
import {
  canAdvanceFinding,
  createFindingSchema,
  diagnoseFindingSchema,
  updateFindingStatusSchema,
} from "@/server/actions/schemas";
import { uploadFindingPhoto } from "@/server/storage";

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

export async function createFinding(formData: FormData): Promise<ActionResult> {
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
    return {
      ok: false,
      message: "Periksa kembali isian formulir.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
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
  const parsed = diagnoseFindingSchema.safeParse({
    findingId: formData.get("findingId"),
    seasonId: formData.get("seasonId"),
    diagnosis: formData.get("diagnosis"),
    treatment: formData.get("treatment"),
    diagnosedById: formData.get("diagnosedById") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali isian formulir.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
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
