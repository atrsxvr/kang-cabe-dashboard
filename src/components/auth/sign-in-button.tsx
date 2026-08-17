"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/**
 * Satu tombol, satu penyedia.
 *
 * Kegagalan ditampilkan sebagai toast dan tombolnya dibuka kembali, bukan
 * dibiarkan berputar: penolakan yang paling mungkin terjadi di sini adalah email
 * yang belum didaftarkan, dan itu keadaan yang perlu dibaca — bukan ditunggu.
 */
export function SignInButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);

  const start = async () => {
    setPending(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
    });

    if (error) {
      toast.error(
        error.message ??
          "Nggak bisa masuk. Kemungkinan email kamu belum didaftarkan Admin."
      );
      setPending(false);
    }
  };

  return (
    <Button onClick={start} disabled={pending} className="w-full">
      {pending ? "Membuka Google…" : "Masuk pakai Google"}
    </Button>
  );
}
