"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/server/actions/seasons";
import {
  createTaskSchema,
  updateTaskStatusSchema,
} from "@/server/actions/schemas";

function fieldErrorsOf(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
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
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali isian formulir.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
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
