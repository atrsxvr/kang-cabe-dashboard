import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SeasonSelectorLoader,
  SeasonSelectorSkeleton,
} from "@/components/seasons/season-selector-loader";
import { requireActor } from "@/server/auth/guard";

/**
 * Route group: the eight modules share this shell without adding a URL segment.
 *
 * **Di sinilah membaca dijaga**, satu tempat untuk kedelapan modul.
 *
 * `proxy.ts` cuma memeriksa ada-tidaknya cookie, dan itu tidak cukup: cookie
 * sesi berumur tujuh hari, jadi anggota yang dinonaktifkan pagi ini masih
 * memegang cookie yang sah sampai seminggu ke depan. Tanpa pemeriksaan di sini,
 * ia tetap bisa **membaca** seluruh aplikasi — yang bisa ditolak cuma
 * tulisannya, karena 55 penjaga di Server Action memang membaca database.
 *
 * `requireActor` membacanya dari database tiap render, jadi pencabutan akses
 * berlaku pada permintaan berikutnya, bukan setelah sesinya kedaluwarsa.
 *
 * Boleh dipanggil dari sini: `unauthorized()` cuma dilarang di **root** layout,
 * dan ini bukan itu. Ia juga bukan galat biasa melainkan interupsi yang punya
 * batasnya sendiri di `app/unauthorized.tsx` — jadi aturan "apa pun yang
 * dirender dari layout harus menangani kegagalannya sendiri" tidak dilanggar:
 * yang ini tidak pernah sampai ke `global-error`.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const actor = await requireActor();

  return (
    <AppShell
      actor={actor}
      seasonSelector={
        <Suspense fallback={<SeasonSelectorSkeleton />}>
          <SeasonSelectorLoader />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
