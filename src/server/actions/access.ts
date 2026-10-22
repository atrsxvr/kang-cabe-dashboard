"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AREAS,
  DEFAULT_WRITERS,
  LOCKED_AREAS,
  type Area,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";

const accessSchema = z.object({
  role: z.enum(["AGRONOMIST", "LOGISTICS", "SALES"], "Peran tidak dikenal"),
  area: z
    .enum(AREAS, "Bagian tidak dikenal")
    .refine((area) => !LOCKED_AREAS.includes(area), "Bagian ini tidak bisa diubah"),
  allowed: z.enum(["true", "false"]).transform((value) => value === "true"),
});

/**
 * One tick in the Akses Peran table. Stored only where it differs from the
 * default, so the table stays the list of what Admin actually changed —
 * and ticking a box back to its default removes the row.
 */
export async function setRoleAccess(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("settings");
  if (!allowed.ok) return allowed;

  const parsed = accessSchema.safeParse({
    role: formData.get("role"),
    area: formData.get("area"),
    allowed: formData.get("allowed"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Permintaan tidak valid." };
  }

  const { role, area, allowed: on } = parsed.data;
  const byDefault = DEFAULT_WRITERS[area as Area].includes(role);

  if (on === byDefault) {
    await prisma.roleAccess.deleteMany({ where: { role, area } });
  } else {
    await prisma.roleAccess.upsert({
      where: { role_area: { role, area } },
      create: { role, area, allowed: on, updatedById: allowed.actor.id },
      update: { allowed: on, updatedById: allowed.actor.id },
    });
  }

  // Every page hides or shows buttons by this.
  revalidatePath("/", "layout");
  return { ok: true };
}
