"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { calculateHst, startOfDayInJakarta } from "@/lib/hst";
import { isSeasonClosed } from "@/lib/season-close";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";
import { notifyScheduledTask } from "@/server/notifications";
import { revalidateSeasonMoney } from "@/server/actions/revalidate";
import { refreshAvgCost } from "@/server/actions/avg-cost";
import {
  createTaskSchema,
  postponeTaskSchema,
  recordTaskUsageSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "@/server/actions/schemas";

/**
 * The picker serialises its amounts into one hidden field; parallel arrays
 * would let a material and its amount drift apart if either list ever came
 * back a different length.
 */
function parseMaterials(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("tasks");
  if (!allowed.ok) return allowed;

  const parsed = createTaskSchema.safeParse({
    seasonId: formData.get("seasonId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
    assigneeIds: formData.getAll("assigneeIds").map(String),
    recipeId: formData.get("recipeId") ?? "",
    recipeVolumeL: formData.get("recipeVolumeL") || undefined,
    findingId: formData.get("findingId") ?? "",
    materials: parseMaterials(formData.get("materials")),
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const {
    seasonId,
    assigneeIds,
    description,
    status,
    recipeId,
    recipeVolumeL,
    materials,
    findingId,
    ...rest
  } = parsed.data;

  // A task must belong to a real season; without this a forged seasonId would
  // create orphan rows that no page ever lists.
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true, startDate: true },
  });

  if (!season) return { ok: false, message: "Musim tidak ditemukan." };

  // Same season, or the link would tie a task to a finding no page shows it
  // beside.
  if (findingId) {
    const finding = await prisma.healthLog.count({
      where: { id: findingId, seasonId },
    });
    if (!finding) return { ok: false, message: "Temuan tidak ditemukan pada musim ini." };
  }

  const task = await prisma.task.create({
    data: {
      ...rest,
      hst: calculateHst(season.startDate, rest.dueDate),
      seasonId,
      status,
      description: description ? description : null,
      completedAt: status === "DONE" ? new Date() : null,
      recipeId: recipeId ? recipeId : null,
      recipeVolumeL: recipeId ? (recipeVolumeL ?? null) : null,
      findingId: findingId ? findingId : null,
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
      materials: { create: materials },
    },
    select: { id: true },
  });

  if (status !== "DONE") announceIfSoon(task.id);
  else await markFindingTreated(task.id);

  revalidatePath("/tasks");
  if (findingId) revalidatePath("/health");
  return { ok: true, taskId: task.id };
}

export async function updateTaskStatus(
  formData: FormData
): Promise<ActionResult> {
  const allowed = await guardWrite("tasks");
  if (!allowed.ok) return allowed;

  const parsed = updateTaskStatusSchema.safeParse({
    taskId: formData.get("taskId"),
    seasonId: formData.get("seasonId"),
    status: formData.get("status"),
  });

  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };

  const { taskId, seasonId, status } = parsed.data;

  // Scoped by seasonId as well as id: the mutation must not reach a task
  // outside the season the user is looking at.
  const result = await prisma.task.updateMany({
    where: { id: taskId, seasonId },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });

  if (result.count === 0) {
    return { ok: false, message: "Tugas tidak ditemukan pada musim ini." };
  }

  if (status === "DONE") await markFindingTreated(taskId);

  revalidatePath("/tasks");
  return { ok: true };
}

/**
 * A finding waiting on treatment is treated once a task scheduled from it is
 * done. Forward only, and only from "Menunggu penanganan": a finding already
 * marked resolved stays resolved, and reopening the task does not unsay that
 * the spraying happened.
 */
async function markFindingTreated(taskId: string) {
  const result = await prisma.healthLog.updateMany({
    where: { status: "DIAGNOSED", tasks: { some: { id: taskId } } },
    data: { status: "TREATED" },
  });
  if (result.count > 0) revalidatePath("/health");
}

export async function deleteTask(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("tasks");
  if (!allowed.ok) return allowed;

  const taskId = String(formData.get("taskId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");

  if (!taskId || !seasonId) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, seasonId },
    select: {
      title: true,
      usageRecordedAt: true,
      season: { select: { status: true } },
      materials: {
        select: { materialId: true, amount: true, totalCost: true },
      },
    },
  });

  if (!task) {
    return { ok: false, message: "Tugas tidak ditemukan pada musim ini." };
  }

  // A closed season's report has been signed and its margin split. Deleting a
  // task would take its materials' cost back out of that report.
  if (isSeasonClosed(task.season.status)) {
    return {
      ok: false,
      message: "Musim ini sudah Selesai. Tugasnya tidak bisa dihapus lagi.",
    };
  }

  // A task whose usage was recorded took real stock out of the shed. Deleting
  // it cascades its TaskMaterial rows — the only place that usage was charged
  // to the season — so leaving the stock down would make the material vanish
  // from the shed without landing on any report. Put it back.
  //
  // Appended as a CORRECTION, not by deleting the USAGE rows: the log says
  // what happened, and it did happen — then it was undone. Priced at the cost
  // frozen on the task, so the shed's value returns to exactly what left it.
  // CORRECTION is not cash (only PURCHASE is), so the kas is untouched.
  const returned = task.usageRecordedAt ? task.materials : [];

  try {
    await prisma.$transaction([
      // `delete`, not `deleteMany`: if another tab got here first this throws
      // and the stock below is never returned twice.
      prisma.task.delete({ where: { id: taskId, seasonId } }),
      ...returned.flatMap((item) => [
        prisma.material.update({
          where: { id: item.materialId },
          data: { stock: { increment: item.amount } },
        }),
        prisma.stockMovement.create({
          data: {
            materialId: item.materialId,
            delta: item.amount,
            reason: "CORRECTION",
            totalCost: item.totalCost,
            note: `Tugas dihapus, pemakaian dikembalikan: ${task.title}`,
            actorId: allowed.actor.id,
          },
        }),
      ]),
    ]);
  } catch (error) {
    if (isNotFound(error)) {
      return { ok: false, message: "Tugas tidak ditemukan pada musim ini." };
    }
    throw error;
  }

  if (returned.length > 0) {
    // A positive movement with a price moves the average; recompute it from
    // the log rather than guessing, as anything touching history must.
    await Promise.all(returned.map((item) => refreshAvgCost(item.materialId)));
    revalidatePath("/inventory");
    revalidatePath("/health/racikan");
    revalidateSeasonMoney();
  }

  revalidatePath("/tasks");
  return { ok: true };
}

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  );
}

export async function updateTask(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("tasks");
  if (!allowed.ok) return allowed;

  const parsed = updateTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    seasonId: formData.get("seasonId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
    assigneeIds: formData.getAll("assigneeIds").map(String),
    recipeId: formData.get("recipeId") ?? "",
    recipeVolumeL: formData.get("recipeVolumeL") || undefined,
    materials: parseMaterials(formData.get("materials")),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const {
    taskId,
    seasonId,
    assigneeIds,
    description,
    status,
    recipeId,
    recipeVolumeL,
    materials,
    ...rest
  } = parsed.data;

  const existing = await prisma.task.findFirst({
    where: { id: taskId, seasonId },
    select: {
      status: true,
      completedAt: true,
      usageRecordedAt: true,
      dueDate: true,
      season: { select: { startDate: true } },
    },
  });

  if (!existing) {
    return { ok: false, message: "Tugas tidak ditemukan pada musim ini." };
  }

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        ...rest,
        hst: calculateHst(existing.season.startDate, rest.dueDate),
        status,
        description: description ? description : null,
        recipeId: recipeId ? recipeId : null,
        recipeVolumeL: recipeId ? (recipeVolumeL ?? null) : null,
        // Editing a task that was already done must not restamp when it was
        // done — the Logbook is ordered by this, and re-dating history is the
        // reason completedAt exists apart from updatedAt.
        completedAt:
          status === "DONE" ? (existing.completedAt ?? new Date()) : null,
      },
    }),
    // Assignees are replaced wholesale: the form submits the full set, and
    // diffing would only add a way for the two to drift apart.
    prisma.taskAssignee.deleteMany({ where: { taskId } }),
    prisma.taskAssignee.createMany({
      data: assigneeIds.map((userId) => ({ taskId, userId })),
      skipDuplicates: true,
    }),
    // Same wholesale replacement as assignees — but only while the amounts are
    // still just a plan. Once they have been taken out of stock, rewriting them
    // would leave the shed short or over by the difference, with nothing
    // recording why.
    ...(existing.usageRecordedAt
      ? []
      : [
          prisma.taskMaterial.deleteMany({ where: { taskId } }),
          prisma.taskMaterial.createMany({
            data: materials.map((item) => ({ ...item, taskId })),
            skipDuplicates: true,
          }),
        ]),
  ]);

  if (status === "DONE" && existing.status !== "DONE") await markFindingTreated(taskId);

  // Moved onto today or tomorrow: the same reminder a new task would get.
  if (status !== "DONE" && rest.dueDate.getTime() !== existing.dueDate.getTime()) {
    announceIfSoon(taskId);
  }

  revalidatePath("/tasks");
  return { ok: true };
}

/**
 * Moves a task that could not be done to another day — rain, or nobody free.
 *
 * Its own action rather than the edit form: it is the one change made most
 * often, from the field, on a task already overdue. The HST moves with the
 * date, because the HST *is* the date counted from planting.
 */
export async function postponeTask(formData: FormData): Promise<ActionResult> {
  const allowed = await guardWrite("tasks");
  if (!allowed.ok) return allowed;

  const parsed = postponeTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    seasonId: formData.get("seasonId"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) return invalidForm(parsed.error);

  const { taskId, seasonId, dueDate } = parsed.data;

  // Postponing is forward: a day already gone is not where the work will
  // happen. Compared in Jakarta days, as the date input is.
  if (dueDate.getTime() < startOfDayInJakarta(new Date())) {
    return {
      ok: false,
      message: "Pilih hari ini atau sesudahnya.",
      fieldErrors: { dueDate: "Tanggalnya sudah lewat" },
    };
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, seasonId },
    select: { status: true, season: { select: { startDate: true, status: true } } },
  });
  if (!task) return { ok: false, message: "Tugas tidak ditemukan pada musim ini." };
  if (task.status === "DONE") {
    return { ok: false, message: "Tugas ini sudah selesai." };
  }
  if (isSeasonClosed(task.season.status)) {
    return { ok: false, message: "Musim ini sudah Selesai." };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { dueDate, hst: calculateHst(task.season.startDate, dueDate) },
  });

  announceIfSoon(taskId);
  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true };
}

/**
 * After the response, like a new finding's notification: saving never waits
 * on a push service, and a phone that cannot be reached is never an error.
 */
function announceIfSoon(taskId: string) {
  const now = new Date();
  after(() =>
    notifyScheduledTask(taskId, now).catch((error) =>
      console.error("[push] scheduled task", error)
    )
  );
}

/**
 * Deducts a completed task's materials from stock, once.
 *
 * Not folded into the status change: a task reaches DONE from the board, the
 * table and the edit form, and hanging the deduction off one of those paths
 * would silently skip the others. This is idempotent and can be triggered from
 * anywhere, including later if it was skipped at the time.
 */
export async function recordTaskUsage(
  formData: FormData
): Promise<ActionResult> {
  /**
   * `inventory`, bukan `tasks` — dan itu keputusan yang perlu disebut.
   *
   * Tombolnya duduk di papan tugas, tapi yang dikerjakannya adalah memotong stok
   * gudang dan membekukan harganya. Yang mengurus gudang Logistik. Mengunci ini
   * ke `tasks`, yang cuma Admin, berarti Logistik tidak bisa memotong stok untuk
   * tugas yang sudah selesai — padahal itu pekerjaannya sehari-hari.
   */
  const allowed = await guardWrite("usage");
  if (!allowed.ok) return allowed;

  const parsed = recordTaskUsageSchema.safeParse({
    taskId: formData.get("taskId"),
    seasonId: formData.get("seasonId"),
    actorId: formData.get("actorId") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };

  const { taskId, seasonId, actorId } = parsed.data;

  const task = await prisma.task.findFirst({
    where: { id: taskId, seasonId },
    select: {
      title: true,
      usageRecordedAt: true,
      season: { select: { status: true } },
      materials: {
        select: {
          id: true,
          amount: true,
          material: {
            select: { id: true, name: true, stock: true, avgCost: true },
          },
        },
      },
    },
  });

  if (!task) {
    return { ok: false, message: "Tugas tidak ditemukan pada musim ini." };
  }

  if (task.usageRecordedAt) {
    return { ok: false, message: "Pemakaian tugas ini sudah tercatat." };
  }

  if (task.materials.length === 0) {
    return { ok: false, message: "Tugas ini tidak memakai bahan dari racikan." };
  }

  // Stock is allowed to go to zero but not below; refusing the whole batch
  // keeps the shed consistent rather than half-deducted.
  const short = task.materials.find(
    (item) => item.material.stock - item.amount < 0
  );

  if (short) {
    return {
      ok: false,
      message: `Stok ${short.material.name} tinggal ${short.material.stock}, butuh ${short.amount}. Perbaiki stoknya dulu.`,
    };
  }

  await prisma.$transaction([
    ...task.materials.flatMap((item) => [
      prisma.material.update({
        where: { id: item.material.id },
        data: { stock: { decrement: item.amount } },
      }),
      prisma.stockMovement.create({
        data: {
          materialId: item.material.id,
          delta: -item.amount,
          reason: "USAGE",
          note: `Pemakaian tugas: ${task.title}`,
          actorId: actorId ? actorId : null,
        },
      }),
      // Frozen here, exactly like the amounts. This is the moment the shed
      // actually gave something up, so this is the price that applies — a
      // sack bought at a higher price next month must not rewrite what this
      // season spent.
      prisma.taskMaterial.update({
        where: { id: item.id },
        data: { totalCost: Math.round(item.amount * item.material.avgCost) },
      }),
    ]),
    prisma.task.update({
      where: { id: taskId },
      data: { usageRecordedAt: new Date() },
    }),
  ]);

  revalidatePath("/tasks");
  revalidatePath("/inventory");
  revalidateSeasonMoney();
  return { ok: true };
}
