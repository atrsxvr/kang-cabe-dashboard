"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Catches render and data-fetch failures inside the dashboard shell — most
 * likely a dropped Supabase pooler connection, which is not rare on a phone in
 * the field. The sidebar stays usable because the boundary sits below it.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-start gap-4 py-8 sm:flex-row">
        <div className="bg-destructive/10 rounded-lg p-3">
          <TriangleAlert className="text-destructive size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">Gagal memuat data</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Koneksi ke database terputus atau ada kesalahan tak terduga. Periksa
            jaringanmu, lalu coba lagi.
          </p>
          {error.digest ? (
            <p className="text-muted-foreground mt-2 font-mono text-xs">
              Kode: {error.digest}
            </p>
          ) : null}
          <Button onClick={reset} className="mt-4" size="sm">
            <RefreshCw className="size-4" aria-hidden />
            Coba lagi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
