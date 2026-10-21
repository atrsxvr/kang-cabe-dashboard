import type { MetadataRoute } from "next";

/**
 * What lets the app be put on a phone's home screen: Safari → Bagikan →
 * Tambahkan ke Layar Utama on an iPhone, the install prompt on Android.
 * Standalone is also what iOS requires before it will deliver push
 * notifications at all.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kang Cabe — Dashboard Kebun",
    short_name: "Kang Cabe",
    description:
      "Pengelolaan kebun cabai rawit: tugas, kesehatan tanaman, gudang, panen, dan keuangan.",
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#14532d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
