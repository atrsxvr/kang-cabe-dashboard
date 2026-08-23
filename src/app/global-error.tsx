"use client";

import { useEffect } from "react";

/**
 * Last resort: replaces the whole document when the root layout itself fails,
 * so it cannot rely on any app styling or components.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.125rem", margin: 0 }}>
            Aplikasi gagal dimuat
          </h1>
          <p style={{ color: "#666", fontSize: "0.875rem", lineHeight: 1.6 }}>
            Terjadi kesalahan pada level aplikasi. Muat ulang halaman; jika
            berulang, laporkan kode di bawah.
          </p>
          {error.digest ? (
            <p style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
              {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 0.875rem",
              borderRadius: "0.375rem",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
