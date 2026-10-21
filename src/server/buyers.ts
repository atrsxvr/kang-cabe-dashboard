import "server-only";

import { sameBuyerName } from "@/lib/buyers";
import { prisma } from "@/lib/prisma";
import { fieldErrorsOf } from "@/server/actions/result";
import { buyerSchema } from "@/server/actions/schemas";

/**
 * Buyer rules shared by the sale form, which can add a buyer on the spot, and
 * the buyer list. Kept out of the "use server" modules so these helpers are
 * not themselves callable from a browser.
 */

/**
 * Another buyer already holding this name, ignoring case and spacing.
 *
 * Reading every name is fine: this is a garden's list of buyers, not a
 * customer database, and the comparison is not one Postgres can index.
 */
export async function findSameNamedBuyer(name: string, exceptId?: string) {
  const buyers = await prisma.buyer.findMany({
    where: exceptId ? { id: { not: exceptId } } : undefined,
    select: { id: true, name: true },
  });
  return buyers.find((buyer) => sameBuyerName(buyer.name, name)) ?? null;
}

/**
 * Reads a buyer's fields from a form. The sale form prefixes them with
 * "buyer" (buyerName, buyerLocation…) so they cannot collide with the sale's
 * own; field errors come back under those same names.
 */
export function parseBuyerFields(formData: FormData, prefix = "") {
  const key = (field: string) =>
    prefix ? `${prefix}${field[0].toUpperCase()}${field.slice(1)}` : field;

  const parsed = buyerSchema.safeParse({
    name: formData.get(key("name")),
    location: formData.get(key("location")),
    kind: formData.get(key("kind")) || undefined,
    whatsapp: formData.get(key("whatsapp")) ?? "",
  });

  if (parsed.success) {
    const { whatsapp, ...rest } = parsed.data;
    return {
      ok: true as const,
      data: { ...rest, whatsapp: whatsapp ? whatsapp : null },
    };
  }

  const errors = fieldErrorsOf(parsed.error);
  return {
    ok: false as const,
    fieldErrors: Object.fromEntries(
      Object.entries(errors).map(([field, message]) => [key(field), message])
    ),
  };
}
