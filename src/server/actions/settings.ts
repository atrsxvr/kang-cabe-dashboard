"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";
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
  const allowed = await guardWrite("settings");
  if (!allowed.ok) return allowed;

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
      // Tidak ada password di sini. Login lewat Google, dan better-auth
      // menyimpan kredensial di tabel Account — bukan di baris anggota.
      // Emailnya yang jadi undangan: mendaftarkan seseorang di sini adalah
      // satu-satunya cara ia bisa masuk.
    },
  });

  revalidate();
  return { ok: true };
}

export async function updateMember(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("settings");
  if (!allowed.ok) return allowed;

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
  const allowed = await guardWrite("settings");
  if (!allowed.ok) return allowed;

  const parsed = deactivateMemberSchema.safeParse({
    memberId: formData.get("memberId"),
    restore: formData.get("restore") ?? undefined,
  });

  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };

  const { memberId, restore } = parsed.data;

  /**
   * Tidak bisa menonaktifkan diri sendiri, dan ini bukan kenyamanan.
   *
   * Settings cuma bisa ditulis Admin. Admin yang menonaktifkan dirinya sendiri
   * langsung kehilangan akses ke satu-satunya halaman yang bisa
   * mengembalikannya — dan jalan keluarnya cuma menyentuh basis data langsung.
   * Satu salah pencet di ponsel, di kebun, dan aplikasinya terkunci untuk
   * semua orang.
   */
  if (!restore && memberId === allowed.actor.id) {
    return {
      ok: false,
      message:
        "Nggak bisa menonaktifkan akun sendiri — nanti nggak ada yang bisa mengaktifkannya lagi.",
    };
  }

  /**
   * Dan harus selalu ada Admin aktif yang tersisa.
   *
   * Menonaktifkan Admin terakhir mengunci Settings untuk semua orang, sama
   * seperti di atas — cuma lewat jalan yang lebih memutar, dan karena itu lebih
   * mudah terjadi tanpa disadari.
   */
  if (!restore) {
    const target = await prisma.user.findUnique({
      where: { id: memberId },
      select: { role: true },
    });

    if (target?.role === "ADMIN") {
      const otherAdmins = await prisma.user.count({
        where: { role: "ADMIN", deletedAt: null, id: { not: memberId } },
      });

      if (otherAdmins === 0) {
        return {
          ok: false,
          message:
            "Ini Admin terakhir yang masih aktif. Angkat Admin lain dulu sebelum menonaktifkannya.",
        };
      }
    }
  }

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
  const allowed = await guardWrite("settings");
  if (!allowed.ok) return allowed;

  const parsed = gardenProfileSchema.safeParse({
    name: formData.get("name"),
    locationName: formData.get("locationName") ?? "",
    bmkgAdm4: formData.get("bmkgAdm4") ?? "",
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    defaultTankLitres: formData.get("defaultTankLitres"),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { locationName, bmkgAdm4, latitude, longitude, ...rest } = parsed.data;

  await prisma.gardenProfile.upsert({
    where: { id: "garden" },
    update: {
      ...rest,
      locationName: locationName ? locationName : null,
      bmkgAdm4: bmkgAdm4 ? bmkgAdm4 : null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
    create: {
      id: "garden",
      ...rest,
      locationName: locationName ? locationName : null,
      bmkgAdm4: bmkgAdm4 ? bmkgAdm4 : null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
  });

  revalidate();
  return { ok: true };
}
