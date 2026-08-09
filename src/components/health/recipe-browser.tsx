"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { RecipeCard } from "@/components/health/recipe-card";
import { phaseLabels } from "@/components/health/recipe-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RecipeRow } from "@/server/queries/recipes";

type Group = "ALL" | "VEGETATIVE" | "GENERATIVE" | "PRODUCTION" | "TREATMENT";

const GROUPS: { value: Group; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "VEGETATIVE", label: phaseLabels.VEGETATIVE },
  { value: "GENERATIVE", label: phaseLabels.GENERATIVE },
  { value: "PRODUCTION", label: phaseLabels.PRODUCTION },
  { value: "TREATMENT", label: "Penanganan" },
];

function matchesGroup(recipe: RecipeRow, group: Group) {
  if (group === "ALL") return true;
  if (group === "TREATMENT") return recipe.kind === "TREATMENT";
  return recipe.kind === "ROUTINE" && recipe.phase === group;
}

/**
 * Filtering happens on the client, unlike the findings list. The library is
 * small and already loaded, and searching by ingredient is most useful when it
 * responds as you type — the round trip a URL-driven filter needs would make
 * it feel worse, and a recipe filter is not something you send to someone.
 */
export function RecipeBrowser({ recipes }: { recipes: RecipeRow[] }) {
  const [group, setGroup] = useState<Group>("ALL");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = {} as Record<Group, number>;
    for (const { value } of GROUPS) {
      map[value] = recipes.filter((r) => matchesGroup(r, value)).length;
    }
    return map;
  }, [recipes]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return recipes.filter((recipe) => {
      if (!matchesGroup(recipe, group)) return false;
      if (!needle) return true;

      // Searching by ingredient matters as much as by name: "what do we use
      // NPK in" is a real question when planning a mix.
      return (
        recipe.name.toLowerCase().includes(needle) ||
        (recipe.targetIssue ?? "").toLowerCase().includes(needle) ||
        recipe.items.some((item) =>
          item.material.name.toLowerCase().includes(needle)
        )
      );
    });
  }, [recipes, group, query]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {GROUPS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGroup(value)}
              aria-pressed={group === value}
              disabled={counts[value] === 0 && value !== "ALL"}
              className={cn(
                "focus-visible:ring-ring rounded-md px-2.5 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-40",
                group === value
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {label}
              <span className="ml-1.5 text-xs tabular-nums opacity-70">
                {counts[value]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-48 flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari racikan atau bahan…"
            aria-label="Cari racikan atau bahan"
            className="pl-8"
          />
          {query ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Hapus pencarian"
              className="absolute top-1/2 right-0.5 size-7 -translate-y-1/2"
              onClick={() => setQuery("")}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          Tidak ada racikan yang cocok
          {query ? ` dengan "${query.trim()}"` : ""}.
        </p>
      ) : (
        <div className="grid gap-3">
          {visible.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
