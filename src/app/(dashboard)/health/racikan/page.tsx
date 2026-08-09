import type { Metadata } from "next";
import { connection } from "next/server";
import { ScrollText } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { CreateMaterialDialog } from "@/components/health/create-material-dialog";
import { CreateRecipeDialog } from "@/components/health/create-recipe-dialog";
import { HealthTabs } from "@/components/health/health-tabs";
import { RecipeBrowser } from "@/components/health/recipe-browser";
import { materialCategoryLabels } from "@/components/health/recipe-labels";
import { Card, CardContent } from "@/components/ui/card";
import { listMaterials, listRecipes } from "@/server/queries/recipes";

export const metadata: Metadata = { title: "Pustaka Racikan" };

export default async function RecipeLibraryPage() {
  // Recipes are shared across seasons, so there is no season to resolve here —
  // but the read is still live, hence connection().
  await connection();

  const [recipes, materials] = await Promise.all([
    listRecipes(),
    listMaterials(),
  ]);

  return (
    <>
      <HealthTabs />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Pustaka Racikan"
          description="Kebutuhan tiap fase dan penanganan masalah. Berlaku untuk semua musim."
        />
        <div className="flex flex-wrap gap-2">
          <CreateMaterialDialog />
          <CreateRecipeDialog materials={materials} />
        </div>
      </div>

      {recipes.length === 0 ? (
        <EmptyState hasMaterials={materials.length > 0} />
      ) : (
        <RecipeBrowser recipes={recipes} />
      )}

      {materials.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium">
            Bahan Terdaftar
            <span className="text-muted-foreground ml-2 text-xs tabular-nums">
              {materials.length}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {materials.map((material) => (
              <span
                key={material.id}
                className="text-muted-foreground rounded-md border px-2.5 py-1 text-xs"
              >
                {material.name}
                <span className="ml-1.5 opacity-70">
                  {material.unit} · {materialCategoryLabels[material.category]}
                </span>
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function EmptyState({ hasMaterials }: { hasMaterials: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="bg-muted rounded-lg p-3">
          <ScrollText className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div>
          <p className="font-medium">Belum ada racikan</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {hasMaterials
              ? "Susun racikan pertama supaya takarannya tidak dihitung manual lagi."
              : "Tambahkan bahan terlebih dahulu, lalu susun racikannya."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
