import Link from "next/link";
import { ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 403 — sudah masuk, tapi bagian ini bukan wilayahnya.
 *
 * Sengaja tidak menyebut peran yang dibutuhkan di sini: halaman ini tidak tahu
 * wilayah mana yang ditolak. Yang menyebut siapa harus dimintai tolong adalah
 * `denialMessage` di penjaga aksinya, yang muncul sebagai toast di tempat orang
 * menekan tombolnya — jauh lebih berguna daripada di halaman terpisah yang
 * sudah membuang apa yang ia ketik.
 */
export default function Forbidden() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="grid gap-4 py-8 text-center">
          <div className="bg-muted mx-auto rounded-xl p-3">
            <ShieldOff className="text-muted-foreground size-6" aria-hidden />
          </div>

          <div className="grid gap-1">
            <h1 className="text-lg font-semibold">Bukan bagianmu</h1>
            <p className="text-muted-foreground text-sm">
              Halaman ini diurus peran lain. Kalau kamu memang butuh mengubah
              sesuatu di situ, minta tolong yang mengurusnya atau Admin.
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href="/">Balik ke Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
