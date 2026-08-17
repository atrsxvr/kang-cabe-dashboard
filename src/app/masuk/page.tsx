import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sprout, TriangleAlert } from "lucide-react";

import { SignInButton } from "@/components/auth/sign-in-button";
import { Card, CardContent } from "@/components/ui/card";
import { authErrorMessage } from "@/lib/auth-errors";
import { authReady } from "@/server/auth/config";
import { currentActor } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Masuk" };

const asString = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

/**
 * Di luar route group `(dashboard)` supaya tidak memakai app shell — sidebar dan
 * pemilih musim tidak masuk akal ditampilkan kepada orang yang belum masuk, dan
 * keduanya menanyakan basis data.
 */
export default async function SignInPage(props: PageProps<"/masuk">) {
  const { lanjut, error } = await props.searchParams;

  const next = asString(lanjut) ?? "/";
  const message = authErrorMessage(asString(error));

  // Yang sudah masuk tidak perlu melihat halaman ini — kecuali ia sampai ke sini
  // karena sebuah galat, yang justru perlu dibaca.
  if (!message && (await currentActor())) redirect(next);

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="grid gap-5 py-8 text-center">
          <div className="bg-muted mx-auto rounded-xl p-3">
            <Sprout
              className="size-7 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          </div>

          <div className="grid gap-1">
            <h1 className="text-lg font-semibold">Kang Cabe Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Masuk pakai Google buat lanjut.
            </p>
          </div>

          {message ? (
            <div
              role="alert"
              className="text-destructive flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{message}</span>
            </div>
          ) : null}

          {authReady ? (
            <>
              <SignInButton next={next} />

              {/* Disebut terang-terangan, karena kalau tidak, orang yang ditolak
                  akan menyangka aplikasinya rusak dan mencoba berkali-kali. */}
              <p className="text-muted-foreground text-xs">
                Cuma anggota yang emailnya sudah didaftarkan Admin yang bisa
                masuk. Kalau ditolak, minta Admin menambahkan Gmail kamu dulu.
              </p>
            </>
          ) : (
            /* Halaman yang bisa dibaca, bukan tumpukan galat. Yang membacanya
               sedang memasang kredensialnya, dan 500 tidak memberi tahu apa pun
               soal berkas mana yang harus diisi. */
            <div className="grid gap-2 rounded-md border border-dashed px-3 py-3 text-left">
              <p className="text-sm font-medium">Login belum dikonfigurasi</p>
              <p className="text-muted-foreground text-xs">
                Isi dulu{" "}
                <code className="text-foreground">GOOGLE_CLIENT_ID</code>,{" "}
                <code className="text-foreground">GOOGLE_CLIENT_SECRET</code>,
                dan <code className="text-foreground">BETTER_AUTH_SECRET</code>{" "}
                di <code className="text-foreground">.env</code>, lalu jalankan
                ulang dev server. Caranya ada di{" "}
                <code className="text-foreground">.env.example</code>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
