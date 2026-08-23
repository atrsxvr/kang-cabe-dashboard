"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { roleLabels, type Role } from "@/lib/permissions";

/**
 * Siapa yang sedang masuk, dan satu jalan keluar.
 *
 * Perannya ditampilkan bukan sebagai hiasan: kalau sebuah tombol tidak ada,
 * yang pertama perlu diketahui orangnya adalah ia sedang masuk sebagai siapa.
 * Tanpa itu, tombol yang hilang terbaca sebagai aplikasi yang rusak.
 */
export function AccountMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: Role;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const signOut = async () => {
    setPending(true);

    const { error } = await authClient.signOut();

    if (error) {
      toast.error(error.message ?? "Nggak bisa keluar. Coba lagi.");
      setPending(false);
      return;
    }

    // Refresh, bukan sekadar push: sesi hidup di cookie yang dibaca di server,
    // jadi cache router harus dibuang atau halaman lamanya tetap tergambar.
    router.push("/masuk");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-xs font-medium"
          aria-label={`Akun ${name}`}
        >
          {initials}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate text-sm">{name}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {email}
          </span>
          <span className="text-muted-foreground text-xs font-normal">
            Masuk sebagai {roleLabels[role]}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled={pending} onSelect={signOut}>
          <LogOut className="size-4" aria-hidden />
          {pending ? "Keluar…" : "Keluar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
