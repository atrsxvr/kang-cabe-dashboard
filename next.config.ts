import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
