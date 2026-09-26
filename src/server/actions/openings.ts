"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import {
  createOpeningSchema,
  updateOpeningSchema,
} from "@/server/actions/schemas";
import { guardWrite } from "@/server/auth/guard";

/**
 * Saldo awal kas: uang milik kebun bersama yang sudah ada sebelum aplikasi
 * dipakai.
 *
 * Dijaga wilayah `capital`, sama dengan setoran dan uang keluar ke anggota. Tiga
 * catatan yang menentukan berapa uang milik siapa sebaiknya dipegang satu orang.
 */

function revalidate() {
  revalidatePath("/finance");
}

export async function createOpening(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  const parsed = createOpeningSchema.safeParse({
    amount: formData.get("amount"),
    countedAt: formData.get("countedAt"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { amount, countedAt, note } = parsed.data;

  await prisma.cashOpening.create({
    data: { amount, countedAt, note: note ? note : null },
  });

  revalidate();
  return { ok: true };
}

export async function updateOpening(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  const parsed = updateOpeningSchema.safeParse({
    openingId: formData.get("openingId"),
    amount: formData.get("amount"),
    countedAt: formData.get("countedAt"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { openingId, amount, countedAt, note } = parsed.data;

  const existing = await prisma.cashOpening.findUnique({
    where: { id: openingId },
    select: { id: true },
  });
  if (!existing) return { ok: false, message: "Saldo awal tidak ditemukan." };

  await prisma.cashOpening.update({
    where: { id: openingId },
    data: { amount, countedAt, note: note ? note : null },
  });

  revalidate();
  return { ok: true };
}

export async function deleteOpening(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  const openingId = String(formData.get("openingId") ?? "");
  if (!openingId) return { ok: false, message: "Permintaan tidak valid." };

  const existing = await prisma.cashOpening.findUnique({
    where: { id: openingId },
    select: { id: true },
  });
  if (!existing) return { ok: false, message: "Saldo awal tidak ditemukan." };

  await prisma.cashOpening.delete({ where: { id: openingId } });

  revalidate();
  return { ok: true };
}
