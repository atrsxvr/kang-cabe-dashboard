"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import {
  createTaskSchema,
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
  const parsed = createTaskSchema.safeParse({
    seasonId: formData.get("seasonId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    hst: formData.get("hst") === "" ? undefined : formData.get("hst"),
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
    assigneeIds: formData.getAll("assigneeIds").map(String),
    recipeId: formData.get("recipeId") ?? "",
    recipeVolumeL: formData.get("recipeVolumeL") || undefined,
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
    ...rest
  } = parsed.data;

  // A task must belong to a real season; without this a forged seasonId would
  // create orphan rows that no page ever lists.
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true },
  });

  if (!season) return { ok: false, message: "Musim tidak ditemukan." };

  await prisma.task.create({
    data: {
      ...rest,
      seasonId,
      status,
      description: description ? description : null,
      completedAt: status === "DONE" ? new Date() : null,
      recipeId: recipeId ? recipeId : null,
      recipeVolumeL: recipeId ? (recipeVolumeL ?? null) : null,
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
      materials: { create: materials },
    },
  });

  revalidatePath("/tasks");
  return { ok: true };
}

export async function updateTaskStatus(
  formData: FormData
): Promise<ActionResult> {
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

  revalidatePath("/tasks");
  return { ok: true };
}

export async function deleteTask(formData: FormData): Promise<ActionResult> {
  const taskId = String(formData.get("taskId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");

  if (!taskId || !seasonId) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  const result = await prisma.task.deleteMany({
    where: { id: taskId, seasonId },
  });

  if (result.count === 0) {
    return { ok: false, message: "Tugas tidak ditemukan pada musim ini." };
  }

  revalidatePath("/tasks");
  return { ok: true };
}

export async function updateTask(formData: FormData): Promise<ActionResult> {
  const parsed = updateTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    seasonId: formData.get("seasonId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    hst: formData.get("hst") === "" ? undefined : formData.get("hst"),
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
    select: { status: true, completedAt: true, usageRecordedAt: true },
  });

  if (!existing) {
    return { ok: false, message: "Tugas tidak ditemukan pada musim ini." };
  }

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        ...rest,
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

  revalidatePath("/tasks");
  return { ok: true };
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
  revalidatePath("/finance");
  return { ok: true };
}
