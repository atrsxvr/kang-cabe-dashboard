import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AppSplash } from "@/components/layout/app-splash";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// The variable names are what globals.css reads in its @theme block; renaming
// one without the other silently drops the font back to the browser default.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * What an iPhone shows while the installed app starts — the green Kang Cabe
 * screen instead of white while the server wakes. iOS takes one image per
 * screen and picks it by exact size, so each iPhone since the 8 is listed.
 * [width, height, pixel ratio] in CSS pixels; the images are generated at
 * width × ratio by height × ratio.
 */
const STARTUP_IMAGES = (
  [
    [375, 667, 2], [414, 736, 3], [414, 896, 2], [375, 812, 3], [414, 896, 3], [360, 780, 3],
    [390, 844, 3], [428, 926, 3], [393, 852, 3], [430, 932, 3], [402, 874, 3], [440, 956, 3],
  ] as const
).map(([width, height, ratio]) => ({
  url: `/splash/splash-${width * ratio}x${height * ratio}.png`,
  media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
}));

export const metadata: Metadata = {
  // "%s" is filled by each page's own title; the dashboard root uses `default`.
  title: {
    template: "%s · Kang Cabe",
    default: "Kang Cabe — Dashboard Budidaya Cabai Rawit",
  },
  description:
    "Dashboard pengelolaan proyek budidaya cabai rawit merah berbasis komunitas.",
  // On an iPhone, "Tambahkan ke Layar Utama" reads these rather than the
  // manifest: the icon, the name under it, and that it opens full screen —
  // which is also what iOS needs before it will deliver notifications.
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: {
    capable: true,
    title: "Kang Cabe",
    statusBarStyle: "default",
    startupImage: STARTUP_IMAGES,
  },
};

export const viewport: Viewport = {
  themeColor: "#14532d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      // next-themes sets the class before paint, which the server render
      // cannot match.
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppSplash />
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
