import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The service worker, as the Next PWA guide sets it: never cached, so an
   * update reaches phones on their next visit rather than whenever a CDN
   * decides; served as JavaScript; and allowed to load nothing but itself.
   */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  experimental: {
    /**
     * Wajib untuk `unauthorized()` dan `forbidden()`, yang dipanggil penjaga di
     * `server/auth/guard.ts`. Tanpa ini keduanya melempar galat biasa alih-alih
     * menampilkan `app/unauthorized.tsx` — dan kegagalannya cuma muncul di jalur
     * yang jarang dilewati: cookie palsu, atau anggota yang dinonaktifkan
     * sementara sesinya masih berjalan. Jalur yang jarang dilewati justru yang
     * paling perlu benar, karena tidak ada yang menemukannya saat mencoba-coba.
     */
    authInterrupts: true,
    serverActions: {
      // Finding photos are downscaled in the browser first, but a file the
      // canvas cannot decode passes through untouched. The default 1 MB would
      // reject those outright.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
