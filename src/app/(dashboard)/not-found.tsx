import Link from "next/link";
import { MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-start gap-4 py-8 sm:flex-row">
        <div className="bg-muted rounded-lg p-3">
          <MapPinOff className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">Halaman tidak ditemukan</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Alamat yang kamu tuju tidak ada. Mungkin modulnya belum dibangun.
          </p>
          <Button asChild className="mt-4" size="sm" variant="secondary">
            <Link href="/">Kembali ke Dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
