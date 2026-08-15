"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import {
  createMemberSchema,
  deactivateMemberSchema,
  gardenProfileSchema,
  updateMemberSchema,
} from "@/server/actions/schemas";

function revalidate() {
  revalidatePath("/settings");
  revalidatePath("/finance");
  revalidatePath("/");
}

export async function createMember(formData: FormData): Promise<ActionResult> {
  const parsed = createMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    profitShare: formData.get("profitShare") || 0,
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { email, profitShare, ...rest } = parsed.data;

  const clash = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (clash) {
    return {
      ok: false,
      message: `Email ${email} sudah dipakai.`,
      fieldErrors: { email: "Email sudah terdaftar" },
    };
  }

  await prisma.user.create({
    data: {
      ...rest,
      email,
      profitShare: profitShare ?? 0,
      // Authentication is not built yet, so there is nothing to hash and
      // nothing that would accept this. Deliberately not a usable secret.
      password: "not-set",
    },
  });

  revalidate();
  return { ok: true };
}

export async function updateMember(formData: FormData): Promise<ActionResult> {
  const parsed = updateMemberSchema.safeParse({
    memberId: formData.get("memberId"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    profitShare: formData.get("profitShare") || 0,
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { memberId, email, profitShare, ...rest } = parsed.data;

  const clash = await prisma.user.findFirst({
    where: { email, id: { not: memberId } },
    select: { id: true },
  });

  if (clash) {
    return {
      ok: false,
      message: `Email ${email} sudah dipakai anggota lain.`,
      fieldErrors: { email: "Email sudah terdaftar" },
    };
  }

  const result = await prisma.user.updateMany({
    where: { id: memberId },
    data: { ...rest, email, profitShare: profitShare ?? 0 },
  });

  if (result.count === 0) {
    return { ok: false, message: "Anggota tidak ditemukan." };
  }

  revalidate();
  return { ok: true };
}

/**
 * Deactivates rather than deletes.
 *
 * A member's name is attached to tasks, findings, harvests, sales and every
 * stock movement they recorded. Deleting the row would either take that
 * history with it or leave it unattributable — and the whole point of
 * recording who did what is that it stays answerable later.
 */
export async function deactivateMember(
  formData: FormData
): Promise<ActionResult> {
  const parsed = deactivateMemberSchema.safeParse({
    memberId: formData.get("memberId"),
    restore: formData.get("restore") ?? undefined,
  });

  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };

  const { memberId, restore } = parsed.data;

  const result = await prisma.user.updateMany({
    where: { id: memberId },
    data: { deletedAt: restore ? null : new Date() },
  });

  if (result.count === 0) {
    return { ok: false, message: "Anggota tidak ditemukan." };
  }

  revalidate();
  return { ok: true };
}

export async function updateGardenProfile(
  formData: FormData
): Promise<ActionResult> {
  const parsed = gardenProfileSchema.safeParse({
    name: formData.get("name"),
    locationName: formData.get("locationName") ?? "",
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    defaultTankLitres: formData.get("defaultTankLitres"),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { locationName, latitude, longitude, ...rest } = parsed.data;

  await prisma.gardenProfile.upsert({
    where: { id: "garden" },
    update: {
      ...rest,
      locationName: locationName ? locationName : null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
    create: {
      id: "garden",
      ...rest,
      locationName: locationName ? locationName : null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
  });

  revalidate();
  return { ok: true };
}
