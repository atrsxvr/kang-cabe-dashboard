import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { TriangleAlert } from "lucide-react";

import { SignInButton } from "@/components/auth/sign-in-button";
import { Card, CardContent } from "@/components/ui/card";
import { authErrorMessage } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/safe-path";
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

  // Disaring, bukan dipakai apa adanya: nilainya datang dari URL, dan
  // `redirect()` akan menuruti `https://…` maupun `//…` dengan senang hati.
  const next = safeNextPath(lanjut);
  const message = authErrorMessage(asString(error));

  // Yang sudah masuk tidak perlu melihat halaman ini — kecuali ia sampai ke sini
  // karena sebuah galat, yang justru perlu dibaca.
  if (!message && (await currentActor())) redirect(next);

  return (
    // The splash's green, carried on. The app opens on this colour (and the
    // phone's status bar is painted it), so signing in is the same place
    // rather than a white page between the splash and the garden.
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#14532d] p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(56rem_36rem_at_50%_-12%,rgb(74_222_128/0.22),transparent_60%),radial-gradient(36rem_28rem_at_100%_112%,rgb(250_204_21/0.12),transparent_60%)]"
      />

      <div className="relative grid w-full max-w-sm gap-6">
        <div className="grid justify-items-center gap-3 text-center">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={72}
            height={72}
            preload
            className="rounded-2xl shadow-lg shadow-black/25"
          />
          {/* Reads "Kang Cabe Dashboard Kebun" as one heading, the way the
              splash says it in two lines. */}
          <h1 className="text-2xl font-bold text-white">
            Kang Cabe{" "}
            <span className="mt-1 block text-sm font-normal text-green-200">
              Dashboard Kebun
            </span>
          </h1>
        </div>

        <Card className="shadow-xl shadow-black/15">
          <CardContent className="grid gap-5 py-6 text-center">
            <p className="text-sm font-medium">Masuk pakai Google buat lanjut.</p>

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
      </div>
    </main>
  );
}
