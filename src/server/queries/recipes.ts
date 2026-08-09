import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  ApplicationMethod,
  GrowthPhase,
  MaterialCategory,
  RecipeKind,
} from "@/generated/prisma/client";

/**
 * Deliberately not scoped by season, unlike every other farming query. A recipe
 * is knowledge, not a season's operational record — its whole value is being
 * reused next season. The exception is documented in CLAUDE.md.
 */

export type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  category: MaterialCategory;
  notes: string | null;
  _count: { recipeItems: number };
};

export async function listMaterials(): Promise<MaterialRow[]> {
  return prisma.material.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { recipeItems: true } } },
  });
}

export type RecipeRow = {
  id: string;
  name: string;
  kind: RecipeKind;
  method: ApplicationMethod;
  phase: GrowthPhase | null;
  targetIssue: string | null;
  intervalDays: number | null;
  basisVolumeL: number;
  preHarvestIntervalDays: number | null;
  notes: string | null;
  author: { id: string; name: string } | null;
  items: {
    id: string;
    amountPerLiter: number;
    note: string | null;
    material: { id: string; name: string; unit: string };
  }[];
};

const recipeSelect = {
  id: true,
  name: true,
  kind: true,
  method: true,
  phase: true,
  targetIssue: true,
  intervalDays: true,
  basisVolumeL: true,
  preHarvestIntervalDays: true,
  notes: true,
  author: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      amountPerLiter: true,
      note: true,
      material: { select: { id: true, name: true, unit: true } },
    },
    orderBy: { material: { name: "asc" } },
  },
} as const;

export async function listRecipes(): Promise<RecipeRow[]> {
  return prisma.recipe.findMany({
    select: recipeSelect,
    // Routine first and in phase order, so the list reads as the season does.
    orderBy: [{ kind: "asc" }, { phase: "asc" }, { name: "asc" }],
  });
}

/** Treatment recipes only — what the diagnose form offers as a prescription. */
export async function listTreatmentRecipes(): Promise<RecipeRow[]> {
  return prisma.recipe.findMany({
    where: { kind: "TREATMENT" },
    select: recipeSelect,
    orderBy: { name: "asc" },
  });
}
