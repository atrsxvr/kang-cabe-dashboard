"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "@/server/actions/schemas";

export async function createTask(formData: FormData): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse({
    seasonId: formData.get("seasonId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    hst: formData.get("hst") === "" ? undefined : formData.get("hst"),
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
    assigneeIds: formData.getAll("assigneeIds").map(String),
  });

  if (!parsed.success) {
    return invalidForm(parsed.error);
  }

  const { seasonId, assigneeIds, description, status, ...rest } = parsed.data;

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
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
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
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { taskId, seasonId, assigneeIds, description, status, ...rest } =
    parsed.data;

  const existing = await prisma.task.findFirst({
    where: { id: taskId, seasonId },
    select: { status: true, completedAt: true },
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
  ]);

  revalidatePath("/tasks");
  return { ok: true };
}
