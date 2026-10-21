"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { revalidateSeasonMoney } from "@/server/actions/revalidate";
import { mergeBuyerSchema } from "@/server/actions/schemas";
import { guardWrite } from "@/server/auth/guard";
import { findSameNamedBuyer, parseBuyerFields } from "@/server/buyers";

/**
 * The buyer list. Written by whoever handles sales — the same people who add
 * a buyer from the sale form — and by Admin.
 */

function revalidate() {
  revalidatePath("/harvest", "layout");
  // A renamed buyer appears in the finance ledger and the dashboard too.
  revalidateSeasonMoney();
}

export async function createBuyer(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const fields = parseBuyerFields(formData);
  if (!fields.ok) {
    return {
      ok: false,
      message: "Periksa kembali isian formulir.",
      fieldErrors: fields.fieldErrors,
    };
  }

  const clash = await findSameNamedBuyer(fields.data.name);
  if (clash) {
    return {
      ok: false,
      message: `Pembeli "${clash.name}" sudah ada.`,
      fieldErrors: { name: "Nama ini sudah ada di daftar" },
    };
  }

  await prisma.buyer.create({ data: fields.data });

  revalidate();
  return { ok: true };
}

export async function updateBuyer(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const buyerId = String(formData.get("buyerId") ?? "");
  if (!buyerId) return { ok: false, message: "Pembeli tidak dikenali." };

  const fields = parseBuyerFields(formData);
  if (!fields.ok) {
    return {
      ok: false,
      message: "Periksa kembali isian formulir.",
      fieldErrors: fields.fieldErrors,
    };
  }

  // Renaming into another buyer's name would make two people one in every
  // list but not in the data. That is what merging is for.
  const clash = await findSameNamedBuyer(fields.data.name, buyerId);
  if (clash) {
    return {
      ok: false,
      message: `Sudah ada pembeli bernama "${clash.name}". Kalau orangnya sama, gabungkan saja.`,
      fieldErrors: { name: "Nama ini sudah dipakai pembeli lain" },
    };
  }

  const result = await prisma.buyer.updateMany({
    where: { id: buyerId },
    data: fields.data,
  });

  if (result.count === 0) return { ok: false, message: "Pembeli tidak ditemukan." };

  revalidate();
  return { ok: true };
}

/**
 * Deletes a buyer who never bought anything — a typo, a duplicate made before
 * any sale. One with sales cannot go (the database restricts it): their sales
 * would lose who bought them. Merge them into the right buyer instead.
 */
export async function deleteBuyer(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const buyerId = String(formData.get("buyerId") ?? "");
  if (!buyerId) return { ok: false, message: "Pembeli tidak dikenali." };

  const result = await prisma.buyer.deleteMany({
    where: { id: buyerId, sales: { none: {} } },
  });

  if (result.count === 0) {
    return {
      ok: false,
      message:
        "Pembeli ini sudah punya penjualan, jadi tidak bisa dihapus. Gabungkan ke pembeli yang benar.",
    };
  }

  revalidate();
  return { ok: true };
}

/**
 * Folds a duplicate into the buyer it really is: every sale moves over, then
 * the duplicate goes. One transaction, so a failure halfway leaves both as
 * they were rather than sales pointing at a buyer that is gone.
 */
export async function mergeBuyer(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const parsed = mergeBuyerSchema.safeParse({
    fromId: formData.get("fromId"),
    intoId: formData.get("intoId"),
  });
  if (!parsed.success) return invalidForm(parsed.error);

  const { fromId, intoId } = parsed.data;
  if (fromId === intoId) {
    return { ok: false, message: "Pilih pembeli lain sebagai tujuan." };
  }

  const both = await prisma.buyer.count({ where: { id: { in: [fromId, intoId] } } });
  if (both !== 2) return { ok: false, message: "Pembeli tidak ditemukan." };

  await prisma.$transaction([
    prisma.saleTransaction.updateMany({
      where: { buyerId: fromId },
      data: { buyerId: intoId },
    }),
    prisma.buyer.delete({ where: { id: fromId } }),
  ]);

  revalidate();
  return { ok: true };
}
