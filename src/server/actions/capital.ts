"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";
import {
  createContributionSchema,
  updateContributionSchema,
} from "@/server/actions/schemas";
import { deletePhoto, uploadPhoto } from "@/server/storage";

/**
 * Capital paid in by members. Never routed through FinanceTransaction: money
 * put in is not money earned, and letting the two share a table is how a
 * season ends up looking profitable on the strength of its owners' savings.
 */

function revalidate() {
  revalidatePath("/finance");
  revalidatePath("/settings");
}

export async function createContribution(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  // Validated before the upload, so a rejected form leaves no orphan file.
  const parsed = createContributionSchema.safeParse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    note: formData.get("note") ?? "",
    seasonId: formData.get("seasonId") ?? "",
    proofUrl: "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { userId, amount, paidAt, note, seasonId } = parsed.data;

  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!member) return { ok: false, message: "Anggota tidak ditemukan." };

  const proof = formData.get("proof");
  let proofUrl: string | null = null;

  if (proof instanceof File && proof.size > 0) {
    const uploaded = await uploadPhoto(proof);
    if (!uploaded.ok) return { ok: false, message: uploaded.message };
    proofUrl = uploaded.url;
  }

  await prisma.capitalContribution.create({
    data: {
      userId,
      amount,
      paidAt,
      note: note ? note : null,
      seasonId: seasonId ? seasonId : null,
      proofUrl,
    },
  });

  revalidate();
  return { ok: true };
}

export async function updateContribution(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  const parsed = updateContributionSchema.safeParse({
    contributionId: formData.get("contributionId"),
    userId: formData.get("userId"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    note: formData.get("note") ?? "",
    seasonId: formData.get("seasonId") ?? "",
    proofUrl: formData.get("proofUrl") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { contributionId, userId, amount, paidAt, note, seasonId, proofUrl } =
    parsed.data;

  const existing = await prisma.capitalContribution.findUnique({
    where: { id: contributionId },
    select: { proofUrl: true },
  });

  if (!existing) return { ok: false, message: "Setoran tidak ditemukan." };

  const proof = formData.get("proof");
  let nextProof = existing.proofUrl;

  if (proof instanceof File && proof.size > 0) {
    const uploaded = await uploadPhoto(proof);
    if (!uploaded.ok) return { ok: false, message: uploaded.message };

    if (existing.proofUrl) await deletePhoto(existing.proofUrl);
    nextProof = uploaded.url;
  } else if (!proofUrl && existing.proofUrl) {
    await deletePhoto(existing.proofUrl);
    nextProof = null;
  }

  await prisma.capitalContribution.update({
    where: { id: contributionId },
    data: {
      userId,
      amount,
      paidAt,
      note: note ? note : null,
      seasonId: seasonId ? seasonId : null,
      proofUrl: nextProof,
    },
  });

  revalidate();
  return { ok: true };
}

export async function deleteContribution(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  const contributionId = String(formData.get("contributionId") ?? "");
  if (!contributionId) return { ok: false, message: "Permintaan tidak valid." };

  const existing = await prisma.capitalContribution.findUnique({
    where: { id: contributionId },
    select: { proofUrl: true },
  });

  if (!existing) return { ok: false, message: "Setoran tidak ditemukan." };

  await prisma.capitalContribution.delete({ where: { id: contributionId } });
  if (existing.proofUrl) await deletePhoto(existing.proofUrl);

  revalidate();
  return { ok: true };
}
