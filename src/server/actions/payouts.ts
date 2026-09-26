"use server";

import { revalidatePath } from "next/cache";

import { netCapital } from "@/lib/cash";
import { formatRupiah } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { createPayoutSchema, updatePayoutSchema } from "@/server/actions/schemas";
import { guardWrite } from "@/server/auth/guard";
import { deletePhoto, uploadPhoto } from "@/server/storage";

/**
 * Uang yang keluar dari kas ke tangan anggota: bagi hasil dan tarik modal.
 *
 * Dijaga wilayah `capital`, sama dengan setoran. Yang mencatat uang masuk dari
 * anggota dan uang keluar ke anggota sebaiknya orang yang sama — dua buku yang
 * dipegang dua orang adalah dua buku yang tidak pernah dicocokkan.
 */

function revalidate() {
  revalidatePath("/finance");
  revalidatePath("/settings");
}

/**
 * Tarik modal tidak boleh melebihi modal bersih orangnya.
 *
 * Tanpa batas ini porsi modal bisa minus, dan porsi minus tidak punya arti
 * yang bisa dijelaskan ke siapa pun. Uang yang keluar melebihi setorannya
 * adalah bagi hasil, bukan tarik modal — dan dicatat sebagai itu.
 */
async function exceedsCapital(
  userId: string,
  amount: number,
  excludePayoutId?: string
): Promise<string | null> {
  const [contributed, returned] = await Promise.all([
    prisma.capitalContribution.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.memberPayout.aggregate({
      where: {
        userId,
        type: "CAPITAL_RETURN",
        ...(excludePayoutId ? { id: { not: excludePayoutId } } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  const available = netCapital(
    contributed._sum.amount ?? 0,
    returned._sum.amount ?? 0
  );

  if (amount <= available) return null;

  return available > 0
    ? `Modal orang ini tinggal ${formatRupiah(available)}. Lebihnya dicatat sebagai bagi hasil.`
    : "Orang ini belum punya modal yang bisa ditarik.";
}

async function seasonExists(seasonId: string): Promise<boolean> {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true },
  });
  return Boolean(season);
}

export async function createPayout(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  // Divalidasi sebelum unggah, supaya formulir yang ditolak tidak meninggalkan
  // berkas yatim di storage.
  const parsed = createPayoutSchema.safeParse({
    userId: formData.get("userId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    seasonId: formData.get("seasonId") ?? "",
    note: formData.get("note") ?? "",
    proofUrl: "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { userId, type, amount, paidAt, seasonId, note } = parsed.data;

  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!member) return { ok: false, message: "Anggota tidak ditemukan." };

  if (seasonId && !(await seasonExists(seasonId))) {
    return { ok: false, message: "Musim tidak ditemukan." };
  }

  if (type === "CAPITAL_RETURN") {
    const problem = await exceedsCapital(userId, amount);
    if (problem) {
      return { ok: false, message: problem, fieldErrors: { amount: problem } };
    }
  }

  const proof = formData.get("proof");
  let proofUrl: string | null = null;

  if (proof instanceof File && proof.size > 0) {
    const uploaded = await uploadPhoto(proof);
    if (!uploaded.ok) return { ok: false, message: uploaded.message };
    proofUrl = uploaded.url;
  }

  await prisma.memberPayout.create({
    data: {
      userId,
      type,
      amount,
      paidAt,
      seasonId: seasonId ? seasonId : null,
      note: note ? note : null,
      proofUrl,
    },
  });

  revalidate();
  return { ok: true };
}

export async function updatePayout(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  const parsed = updatePayoutSchema.safeParse({
    payoutId: formData.get("payoutId"),
    userId: formData.get("userId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    seasonId: formData.get("seasonId") ?? "",
    note: formData.get("note") ?? "",
    proofUrl: formData.get("proofUrl") ?? "",
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { payoutId, userId, type, amount, paidAt, seasonId, note, proofUrl } =
    parsed.data;

  const existing = await prisma.memberPayout.findUnique({
    where: { id: payoutId },
    select: { proofUrl: true },
  });
  if (!existing) return { ok: false, message: "Catatan tidak ditemukan." };

  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!member) return { ok: false, message: "Anggota tidak ditemukan." };

  if (seasonId && !(await seasonExists(seasonId))) {
    return { ok: false, message: "Musim tidak ditemukan." };
  }

  if (type === "CAPITAL_RETURN") {
    // Catatan yang sedang diedit dikeluarkan dari hitungan, kalau tidak ia
    // menghalangi dirinya sendiri.
    const problem = await exceedsCapital(userId, amount, payoutId);
    if (problem) {
      return { ok: false, message: problem, fieldErrors: { amount: problem } };
    }
  }

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

  await prisma.memberPayout.update({
    where: { id: payoutId },
    data: {
      userId,
      type,
      amount,
      paidAt,
      seasonId: seasonId ? seasonId : null,
      note: note ? note : null,
      proofUrl: nextProof,
    },
  });

  revalidate();
  return { ok: true };
}

export async function deletePayout(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  const payoutId = String(formData.get("payoutId") ?? "");
  if (!payoutId) return { ok: false, message: "Permintaan tidak valid." };

  const existing = await prisma.memberPayout.findUnique({
    where: { id: payoutId },
    select: { proofUrl: true },
  });
  if (!existing) return { ok: false, message: "Catatan tidak ditemukan." };

  await prisma.memberPayout.delete({ where: { id: payoutId } });
  if (existing.proofUrl) await deletePhoto(existing.proofUrl);

  revalidate();
  return { ok: true };
}
