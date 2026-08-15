"use server";

import { revalidatePath } from "next/cache";

import { amountForVolume } from "@/lib/dose";
import { prisma } from "@/lib/prisma";
import { invalidForm, type ActionResult } from "@/server/actions/result";
import { scheduleProgramSchema } from "@/server/actions/schemas";

/**
 * Lays a routine recipe across a stretch of the season as a run of tasks.
 *
 * The mixing schedule is the one part of this job that is genuinely
 * repetitive — every three days from HST 30 to HST 90 is twenty identical
 * tasks, and typing them by hand is how half of them end up missing.
 *
 * Each generated task copies the recipe's amounts exactly as a hand-made one
 * would, so nothing downstream has to know it came from a program: the same
 * Catat pemakaian button, the same frozen cost, the same season report.
 */
export async function scheduleProgram(
  formData: FormData
): Promise<ActionResult> {
  const parsed = scheduleProgramSchema.safeParse({
    seasonId: formData.get("seasonId"),
    recipeId: formData.get("recipeId"),
    fromHst: formData.get("fromHst"),
    toHst: formData.get("toHst"),
    intervalDays: formData.get("intervalDays"),
    volumeL: formData.get("volumeL"),
    assigneeIds: formData.getAll("assigneeIds").map(String),
  });

  if (!parsed.success) return invalidForm(parsed.error);

  const { seasonId, recipeId, fromHst, toHst, intervalDays, volumeL, assigneeIds } =
    parsed.data;

  const [season, recipe] = await Promise.all([
    prisma.season.findUnique({
      where: { id: seasonId },
      select: { startDate: true },
    }),
    prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        name: true,
        items: {
          select: {
            amountPerLiter: true,
            material: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    }),
  ]);

  if (!season) return { ok: false, message: "Musim tidak ditemukan." };
  if (!recipe) return { ok: false, message: "Racikan tidak ditemukan." };

  // Which HSTs this recipe already covers, so running the same program twice
  // extends it rather than doubling it.
  const existing = await prisma.task.findMany({
    where: { seasonId, recipeId },
    select: { hst: true },
  });
  const taken = new Set(existing.map((task) => task.hst));

  const materials = recipe.items.map((item) => ({
    materialId: item.material.id,
    amount: amountForVolume(item, volumeL),
  }));

  const planned: number[] = [];
  for (let hst = fromHst; hst <= toHst; hst += intervalDays) {
    if (!taken.has(hst)) planned.push(hst);
  }

  if (planned.length === 0) {
    return {
      ok: true,
      message: "Semua jadwalnya sudah ada, nggak ada yang ditambah.",
    };
  }

  await prisma.$transaction(
    planned.map((hst) => {
      const dueDate = new Date(season.startDate);
      dueDate.setDate(dueDate.getDate() + hst);

      return prisma.task.create({
        data: {
          seasonId,
          title: `${recipe.name} · HST ${hst}`,
          description: `${recipe.name}, ${volumeL} liter.\n${recipe.items
            .map(
              (item) =>
                `- ${item.material.name}: ${amountForVolume(item, volumeL)} ${item.material.unit}`
            )
            .join("\n")}`,
          hst,
          dueDate,
          status: "TODO",
          recipeId,
          recipeVolumeL: volumeL,
          materials: { create: materials },
          assignees: { create: assigneeIds.map((userId) => ({ userId })) },
        },
      });
    })
  );

  revalidatePath("/tasks");
  return { ok: true, message: `${planned.length} tugas dijadwalkan.` };
}
