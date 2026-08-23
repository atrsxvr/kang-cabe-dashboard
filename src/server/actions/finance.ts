"use server";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";
import { revalidateSeasonMoney } from "@/server/actions/revalidate";
import {
  createFinanceEntrySchema,
  updateFinanceEntrySchema,
} from "@/server/actions/schemas";
import { deletePhoto, uploadPhoto } from "@/server/storage";

/**
 * Money that does not pass through the shed or the scales: wages, rent, the
 * trip to town. Sales stay where they are — income is read from them directly
 * rather than copied here, so there is only ever one row per rupiah.
 */

const revalidate = revalidateSeasonMoney;

export async function createFinanceEntry(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("finance");
  if (!allowed.ok) return allowed;

  // Validated before the upload. Uploading first left a file in the bucket
  // every time the form came back with an error.
  const parsed = createFinanceEntrySchema.safeParse({
    seasonId: formData.get("seasonId"),
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    date: formData.get("date"),
    proofUrl: "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const season = await prisma.season.findUnique({
    where: { id: parsed.data.seasonId },
    select: { id: true },
  });

  if (!season) return { ok: false, message: "Musim tidak ditemukan." };

  const proof = formData.get("proof");
  let proofUrl: string | null = null;

  if (proof instanceof File && proof.size > 0) {
    const uploaded = await uploadPhoto(proof);
    if (!uploaded.ok) return { ok: false, message: uploaded.message };
    proofUrl = uploaded.url;
  }

  // proofUrl is parsed as empty here and replaced by whatever the upload
  // returned; the schema field only exists so create and update share a shape.
  const { seasonId, type, category, amount, description, date } = parsed.data;

  await prisma.financeTransaction.create({
    data: { seasonId, type, category, amount, description, date, proofUrl },
  });

  revalidate();
  return { ok: true };
}

export async function updateFinanceEntry(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("finance");
  if (!allowed.ok) return allowed;

  const parsed = updateFinanceEntrySchema.safeParse({
    entryId: formData.get("entryId"),
    seasonId: formData.get("seasonId"),
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    date: formData.get("date"),
    proofUrl: formData.get("proofUrl") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { entryId, seasonId, proofUrl, ...rest } = parsed.data;

  const existing = await prisma.financeTransaction.findFirst({
    where: { id: entryId, seasonId },
    select: { proofUrl: true },
  });

  if (!existing) {
    return { ok: false, message: "Catatan tidak ditemukan pada musim ini." };
  }

  const proof = formData.get("proof");
  let nextProof = existing.proofUrl;

  if (proof instanceof File && proof.size > 0) {
    const uploaded = await uploadPhoto(proof);
    if (!uploaded.ok) return { ok: false, message: uploaded.message };

    // The replaced file has nothing left pointing at it.
    if (existing.proofUrl) await deletePhoto(existing.proofUrl);
    nextProof = uploaded.url;
  } else if (!proofUrl && existing.proofUrl) {
    await deletePhoto(existing.proofUrl);
    nextProof = null;
  }

  await prisma.financeTransaction.update({
    where: { id: entryId },
    data: { ...rest, seasonId, proofUrl: nextProof },
  });

  revalidate();
  return { ok: true };
}

export async function deleteFinanceEntry(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("finance");
  if (!allowed.ok) return allowed;

  const entryId = String(formData.get("entryId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");

  if (!entryId || !seasonId) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  const existing = await prisma.financeTransaction.findFirst({
    where: { id: entryId, seasonId },
    select: { proofUrl: true },
  });

  if (!existing) {
    return { ok: false, message: "Catatan tidak ditemukan pada musim ini." };
  }

  await prisma.financeTransaction.delete({ where: { id: entryId } });
  // Deleting only the row would leave the receipt orphaned in the bucket.
  if (existing.proofUrl) await deletePhoto(existing.proofUrl);

  revalidate();
  return { ok: true };
}
