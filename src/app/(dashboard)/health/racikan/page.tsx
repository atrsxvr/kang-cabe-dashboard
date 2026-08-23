import type { Metadata } from "next";
import { connection } from "next/server";
import { ScrollText } from "lucide-react";

import { CanWrite } from "@/components/auth/can-write";
import { PageHeader } from "@/components/common/page-header";
import { MaterialArchiveAction } from "@/components/inventory/material-archive-action";
import { MaterialDialog } from "@/components/inventory/material-dialog";
import { RecipeDialog } from "@/components/health/recipe-dialog";
import { RecipeBrowser } from "@/components/health/recipe-browser";
import { materialCategoryLabels } from "@/components/inventory/inventory-labels";
import { Card, CardContent } from "@/components/ui/card";
import { listStock } from "@/server/queries/inventory";
import { listRecipes } from "@/server/queries/recipes";

export const metadata: Metadata = { title: "Pustaka Racikan" };

export default async function RecipeLibraryPage() {
  // Recipes are shared across seasons, so there is no season to resolve here —
  // but the read is still live, hence connection().
  await connection();

  const [recipes, materials] = await Promise.all([listRecipes(), listStock()]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Pustaka Racikan"
          description="Kebutuhan tiap fase dan penanganan masalah. Berlaku untuk semua musim."
        />
        <div className="flex flex-wrap gap-2">
          <CanWrite area="materials">
            <MaterialDialog />
          </CanWrite>
          <CanWrite area="recipes">
            <RecipeDialog materials={materials} />
          </CanWrite>
        </div>
      </div>

      {recipes.length === 0 ? (
        <EmptyState hasMaterials={materials.length > 0} />
      ) : (
        <RecipeBrowser recipes={recipes} materials={materials} />
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
                className="text-muted-foreground flex items-center gap-1 rounded-md border py-1 pr-1 pl-2.5 text-xs"
              >
                {material.name}
                <span className="opacity-70">
                  {material.unit} · {materialCategoryLabels[material.category]}
                </span>
                <CanWrite area="materials">
                  <MaterialDialog material={material} compact />
                </CanWrite>
                <MaterialArchiveAction material={material} compact />
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
