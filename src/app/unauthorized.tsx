import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 401 — belum masuk, atau sesinya sudah tidak sah lagi.
 *
 * Berkas ini yang membuat `unauthorized()` menampilkan sesuatu alih-alih
 * meledak. Halaman terpisah dari `forbidden.tsx` karena keduanya menuntut
 * tindakan yang berbeda: yang ini "masuk dulu", yang itu "minta tolong orang
 * lain" — dan menggabungkannya jadi satu pesan membuat keduanya tidak berguna.
 *
 * Paling sering muncul karena anggotanya dinonaktifkan sementara sesinya masih
 * berjalan: cookie-nya sah, tapi haknya sudah dicabut.
 */
export default function Unauthorized() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="grid gap-4 py-8 text-center">
          <div className="bg-muted mx-auto rounded-xl p-3">
            <LogIn className="text-muted-foreground size-6" aria-hidden />
          </div>

          <div className="grid gap-1">
            <h1 className="text-lg font-semibold">Belum bisa masuk sini</h1>
            <p className="text-muted-foreground text-sm">
              Sesi kamu udah nggak berlaku, atau akunmu sudah dinonaktifkan.
              Masuk lagi buat lanjut — kalau tetap ditolak, minta Admin
              mengaktifkan akunmu.
            </p>
          </div>

          <Button asChild>
            <Link href="/masuk">Masuk lagi</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
