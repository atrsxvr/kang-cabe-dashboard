"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Menggambar ulang halaman dari server secara berkala, tanpa reload.
 *
 * Dashboard dibiarkan terbuka di HP berjam-jam — tab yang ditinggal semalam
 * lalu dibuka pagi masih menampilkan ramalan dan tugas kemarin. `router.refresh`
 * mengambil ulang Server Component-nya tanpa membuang state di browser: scroll,
 * dialog yang sedang terbuka, dan isian form tetap di tempatnya.
 *
 * Dua pemicu, karena tab yang tidak kelihatan tidak menjalankan timer dengan
 * andal — HP membekukannya:
 *
 * - **Kembali terlihat**, kalau sudah lewat `minGapMs` sejak gambar terakhir.
 *   Ini yang menangkap kasus "dibuka lagi pagi hari".
 * - **Tiap `everyMs` selama terlihat**, untuk layar yang dibiarkan menyala.
 *
 * Tidak menembus cache server: ramalan BMKG tetap di-cache sejam. Refresh yang
 * jatuh setelah cache kedaluwarsa memicu pengambilan baru di belakang, dan
 * refresh berikutnya membawanya.
 */
export function LiveRefresh({
  everyMs = 15 * 60_000,
  minGapMs = 5 * 60_000,
}: {
  everyMs?: number;
  minGapMs?: number;
}) {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();

    const refresh = () => {
      last.current = Date.now();
      router.refresh();
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last.current >= minGapMs) refresh();
    };

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, everyMs);

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, everyMs, minGapMs]);

  return null;
}
