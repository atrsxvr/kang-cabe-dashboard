import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

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

export const metadata: Metadata = {
  // "%s" is filled by each page's own title; the dashboard root uses `default`.
  title: {
    template: "%s · Kang Cabe",
    default: "Kang Cabe — Dashboard Budidaya Cabai Rawit",
  },
  description:
    "Dashboard pengelolaan proyek budidaya cabai rawit merah berbasis komunitas.",
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
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
