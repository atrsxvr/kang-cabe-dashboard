"use server";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";
import { revalidateSeasonMoney } from "@/server/actions/revalidate";
import {
  createHarvestSchema,
  createSaleSchema,
  markSalePaidSchema,
  NEW_BUYER,
  updateHarvestSchema,
  updateSaleSchema,
} from "@/server/actions/schemas";
import { findSameNamedBuyer, parseBuyerFields } from "@/server/buyers";

/**
 * Harvest and sales both hang off a season, and every mutation here proves it
 * before writing — a forged seasonId would otherwise let one planting's
 * figures be edited from another's page.
 */

function revalidate() {
  revalidateSeasonMoney();
}

/** The picker serialises its rows into one hidden field, like task materials. */
function parseItems(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function seasonExists(seasonId: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true },
  });
  return Boolean(season);
}

export async function createHarvest(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const parsed = createHarvestSchema.safeParse({
    seasonId: formData.get("seasonId"),
    harvestDate: formData.get("harvestDate"),
    goodKg: formData.get("goodKg") || 0,
    rejectKg: formData.get("rejectKg") || 0,
    notes: formData.get("notes") ?? "",
    recordedById: formData.get("recordedById") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { seasonId, notes, recordedById, ...rest } = parsed.data;

  if (!(await seasonExists(seasonId))) {
    return { ok: false, message: "Musim tidak ditemukan." };
  }

  await prisma.harvestLog.create({
    data: {
      ...rest,
      seasonId,
      notes: notes ? notes : null,
      recordedById: recordedById ? recordedById : null,
    },
  });

  revalidate();
  return { ok: true };
}

export async function updateHarvest(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const parsed = updateHarvestSchema.safeParse({
    harvestId: formData.get("harvestId"),
    seasonId: formData.get("seasonId"),
    harvestDate: formData.get("harvestDate"),
    goodKg: formData.get("goodKg") || 0,
    rejectKg: formData.get("rejectKg") || 0,
    notes: formData.get("notes") ?? "",
    recordedById: formData.get("recordedById") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { harvestId, seasonId, notes, recordedById, ...rest } = parsed.data;

  const result = await prisma.harvestLog.updateMany({
    where: { id: harvestId, seasonId },
    data: {
      ...rest,
      notes: notes ? notes : null,
      recordedById: recordedById ? recordedById : null,
    },
  });

  if (result.count === 0) {
    return { ok: false, message: "Panen tidak ditemukan pada musim ini." };
  }

  revalidate();
  return { ok: true };
}

export async function deleteHarvest(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const harvestId = String(formData.get("harvestId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");

  if (!harvestId || !seasonId) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  const result = await prisma.harvestLog.deleteMany({
    where: { id: harvestId, seasonId },
  });

  if (result.count === 0) {
    return { ok: false, message: "Panen tidak ditemukan pada musim ini." };
  }

  revalidate();
  return { ok: true };
}

/**
 * The buyer a sale names: an existing one picked from the list, or a new one
 * typed into the same form — a one-off buyer should not need anyone to leave
 * the sale and register them first. A new name that matches an existing buyer
 * is refused rather than quietly doubled, which is the mess the list exists
 * to end.
 */
type NewBuyer = {
  name: string;
  location: string;
  kind: "PENGEPUL" | "PASAR" | "KONSUMEN";
  whatsapp: string | null;
};

async function resolveBuyer(
  formData: FormData,
  buyerId: string
): Promise<
  | { ok: true; buyer: { connect: { id: string } } | { create: NewBuyer } }
  | (ActionResult & { ok: false })
> {
  if (buyerId !== NEW_BUYER) {
    const exists = await prisma.buyer.findUnique({
      where: { id: buyerId },
      select: { id: true },
    });
    return exists
      ? { ok: true, buyer: { connect: { id: buyerId } } }
      : {
          ok: false,
          message: "Pembeli tidak ditemukan.",
          fieldErrors: { buyerId: "Pilih lagi dari daftar" },
        };
  }

  const fields = parseBuyerFields(formData, "buyer");
  if (!fields.ok) {
    return {
      ok: false,
      message: "Lengkapi data pembeli baru.",
      fieldErrors: fields.fieldErrors,
    };
  }

  const clash = await findSameNamedBuyer(fields.data.name);
  if (clash) {
    return {
      ok: false,
      message: `"${clash.name}" sudah ada di daftar pembeli — pilih dari daftar.`,
      fieldErrors: { buyerName: "Sudah ada di daftar" },
    };
  }

  return { ok: true, buyer: { create: fields.data } };
}

export async function createSale(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const parsed = createSaleSchema.safeParse({
    seasonId: formData.get("seasonId"),
    soldAt: formData.get("soldAt"),
    buyerId: formData.get("buyerId"),
    isPaid: formData.get("isPaid") === "on" || formData.get("isPaid") === "true",
    notes: formData.get("notes") ?? "",
    recordedById: formData.get("recordedById") ?? "",
    items: parseItems(formData.get("items")),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { seasonId, notes, recordedById, isPaid, items, buyerId, ...rest } =
    parsed.data;

  if (!(await seasonExists(seasonId))) {
    return { ok: false, message: "Musim tidak ditemukan." };
  }

  const buyer = await resolveBuyer(formData, buyerId);
  if (!buyer.ok) return buyer;

  // A new buyer is created in the same write as the sale: no buyer row is
  // left behind if the sale fails, and no sale without its buyer.
  await prisma.saleTransaction.create({
    data: {
      ...rest,
      season: { connect: { id: seasonId } },
      buyer: buyer.buyer,
      isPaid: Boolean(isPaid),
      // Paid on the spot is dated the day of the sale, not the day it was
      // typed — the two are often not the same.
      paidAt: isPaid ? rest.soldAt : null,
      notes: notes ? notes : null,
      recordedBy: recordedById ? { connect: { id: recordedById } } : undefined,
      items: { create: items },
    },
  });

  revalidate();
  return { ok: true };
}

export async function updateSale(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const parsed = updateSaleSchema.safeParse({
    saleId: formData.get("saleId"),
    seasonId: formData.get("seasonId"),
    soldAt: formData.get("soldAt"),
    buyerId: formData.get("buyerId"),
    isPaid: formData.get("isPaid") === "on" || formData.get("isPaid") === "true",
    notes: formData.get("notes") ?? "",
    recordedById: formData.get("recordedById") ?? "",
    items: parseItems(formData.get("items")),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { saleId, seasonId, notes, recordedById, isPaid, items, buyerId, ...rest } =
    parsed.data;

  const existing = await prisma.saleTransaction.findFirst({
    where: { id: saleId, seasonId },
    select: { paidAt: true },
  });

  if (!existing) {
    return { ok: false, message: "Penjualan tidak ditemukan pada musim ini." };
  }

  const buyer = await resolveBuyer(formData, buyerId);
  if (!buyer.ok) return buyer;

  await prisma.$transaction([
    prisma.saleTransaction.update({
      where: { id: saleId },
      data: {
        ...rest,
        buyer: buyer.buyer,
        isPaid: Boolean(isPaid),
        // Editing a sale that was already settled must not restamp when it was
        // settled; that date is what an unpaid list is measured against.
        paidAt: isPaid ? (existing.paidAt ?? rest.soldAt) : null,
        notes: notes ? notes : null,
        recordedBy: recordedById
          ? { connect: { id: recordedById } }
          : { disconnect: true },
      },
    }),
    // Replaced wholesale, like task materials: the form always submits the
    // complete set, and diffing would only invent a way for them to drift.
    prisma.saleItem.deleteMany({ where: { saleId } }),
    prisma.saleItem.createMany({
      data: items.map((item) => ({ ...item, saleId })),
    }),
  ]);

  revalidate();
  return { ok: true };
}

export async function deleteSale(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const saleId = String(formData.get("saleId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");

  if (!saleId || !seasonId) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  const result = await prisma.saleTransaction.deleteMany({
    where: { id: saleId, seasonId },
  });

  if (result.count === 0) {
    return { ok: false, message: "Penjualan tidak ditemukan pada musim ini." };
  }

  revalidate();
  return { ok: true };
}

/**
 * Settles an invoice, or takes the settlement back.
 *
 * Its own action rather than a trip through the edit form: chasing payment is
 * a different job from correcting what was sold, and it happens weeks later.
 */
export async function markSalePaid(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("harvest");
  if (!allowed.ok) return allowed;

  const parsed = markSalePaidSchema.safeParse({
    saleId: formData.get("saleId"),
    seasonId: formData.get("seasonId"),
    unpaid: formData.get("unpaid") ?? undefined,
  });

  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };

  const { saleId, seasonId, unpaid } = parsed.data;

  const result = await prisma.saleTransaction.updateMany({
    where: { id: saleId, seasonId },
    data: {
      isPaid: !unpaid,
      paidAt: unpaid ? null : new Date(),
    },
  });

  if (result.count === 0) {
    return { ok: false, message: "Penjualan tidak ditemukan pada musim ini." };
  }

  revalidate();
  return { ok: true };
}
