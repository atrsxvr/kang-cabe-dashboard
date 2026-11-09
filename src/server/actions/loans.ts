"use server";

import { revalidatePath } from "next/cache";

import { formatRupiah } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { loanEntrySchema } from "@/server/actions/schemas";
import { guardWrite } from "@/server/auth/guard";
import { loanOutstanding } from "@/server/queries/cash";

/**
 * Pinjaman anggota dari kas, dan pengembaliannya.
 *
 * Dijaga wilayah `capital`, sama dengan setoran dan bagi hasil: semua uang
 * yang berpindah antara kas dan kantong anggota dipegang satu orang, supaya
 * ada satu buku yang bisa dicocokkan.
 */

function revalidate() {
  revalidatePath("/finance");
}

export async function recordLoanEntry(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  const parsed = loanEntrySchema.safeParse({
    userId: formData.get("userId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return invalidForm(parsed.error);

  const { userId, type, amount, date, note } = parsed.data;

  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!member) return { ok: false, message: "Anggota tidak ditemukan." };

  // Paying back more than is owed would leave a balance the kas owes the
  // member — a debt nobody agreed to, recorded by a typo.
  if (type === "REPAID") {
    const owed = await loanOutstanding(userId);
    if (amount > owed) {
      const message =
        owed > 0
          ? `Sisa pinjamannya tinggal ${formatRupiah(owed)}.`
          : "Orang ini tidak punya pinjaman.";
      return { ok: false, message, fieldErrors: { amount: message } };
    }
  }

  await prisma.memberLoan.create({
    data: { userId, type, amount, date, note: note ? note : null },
  });

  revalidate();
  return { ok: true };
}

export async function deleteLoanEntry(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("capital");
  if (!allowed.ok) return allowed;

  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) return { ok: false, message: "Permintaan tidak valid." };

  const entry = await prisma.memberLoan.findUnique({
    where: { id: entryId },
    select: { type: true, userId: true, amount: true, payoutId: true },
  });
  if (!entry) return { ok: false, message: "Catatan tidak ditemukan." };

  // A cut from a profit share belongs to that payout; deleting it alone would
  // leave the share recorded as paid in full with the loan still open.
  if (entry.payoutId) {
    return {
      ok: false,
      message:
        "Potongan ini ikut catatan bagi hasilnya. Ubah atau hapus bagi hasil itu.",
    };
  }

  // Removing a loan that has repayments against it would leave more paid back
  // than was ever borrowed.
  if (entry.type === "LENT") {
    const owed = await loanOutstanding(entry.userId);
    if (owed - entry.amount < 0) {
      return {
        ok: false,
        message:
          "Pinjaman ini sudah ada pengembaliannya. Hapus pengembaliannya dulu.",
      };
    }
  }

  await prisma.memberLoan.delete({ where: { id: entryId } });

  revalidate();
  return { ok: true };
}
