"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The server cannot know the visitor's theme, so which icon is correct is
 * unknowable at render time. Rather than gating on a `mounted` flag — which
 * costs a state update on every mount and leaves a placeholder gap — both icons
 * are rendered and CSS picks one from the `.dark` class next-themes sets before
 * paint. Nothing to hydrate, nothing to shift.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Ubah tema terang/gelap"
    >
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </Button>
  );
}
