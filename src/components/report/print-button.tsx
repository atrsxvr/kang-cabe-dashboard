"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The browser's own print dialog, which on every phone and desktop also
 * offers "Simpan sebagai PDF". No PDF library: the page is already the
 * document, and a second rendering of it would be a second thing to keep
 * in step with the first.
 */
export function PrintButton() {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      Cetak / Simpan PDF
    </Button>
  );
}
