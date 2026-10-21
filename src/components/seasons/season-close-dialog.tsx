"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  CircleCheck,
  FileText,
  Flag,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ClosingCheck } from "@/lib/season-close";
import { cn } from "@/lib/utils";
import {
  advanceSeasonStatus,
  getClosingChecklist,
} from "@/server/actions/seasons";

/**
 * Closing a season, with its loose ends laid out first.
 *
 * Replaces the plain "→ Selesai" step because Selesai is when the margin gets
 * split, and the split is only as right as what was recorded. The checklist
 * is fetched when the dialog opens, so it reflects the season as it is now.
 * Every item has to be settled before the season can close — the owner's
 * rule, enforced again on the server — and once closed, the report is one
 * tap away.
 */
export function SeasonCloseDialog({
  seasonId,
  seasonName,
  done = false,
}: {
  seasonId: string;
  seasonName: string;
  /**
   * Already Selesai: no button, only "Tahap akhir". Rendered by this same
   * component rather than in its place, because closing revalidates the page
   * and the season comes back Selesai while "… ditutup" is still on screen —
   * swapping the component out unmounted the dialog with its report link.
   */
  done?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState<ClosingCheck[] | null>(null);
  const [closed, setClosed] = useState(false);
  const [loading, startLoading] = useTransition();
  const [closing, startClosing] = useTransition();
  const router = useRouter();

  const load = () => {
    startLoading(async () => {
      const result = await getClosingChecklist(seasonId);
      if (!result) {
        toast.error("Daftar periksa tidak bisa dimuat. Coba lagi.");
        setOpen(false);
        return;
      }
      setChecks(result);
    });
  };

  const pending = checks?.filter((check) => !check.ok) ?? [];
  const allClear = checks !== null && pending.length === 0;

  const close = () => {
    startClosing(async () => {
      const formData = new FormData();
      formData.set("seasonId", seasonId);
      const result = await advanceSeasonStatus(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setClosed(true);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
        else {
          setChecks(null);
          setClosed(false);
        }
      }}
    >
      {done ? (
        <span className="text-muted-foreground text-xs">Tahap akhir</span>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="secondary" className="h-8">
            <Flag className="size-3.5" aria-hidden />
            Tutup Musim
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {closed ? (
          <>
            <DialogHeader>
              <DialogTitle>{seasonName} ditutup</DialogTitle>
              <DialogDescription>
                Statusnya sekarang Selesai. Laporan musimnya siap dicetak atau
                disimpan sebagai PDF untuk ditandatangani bersama.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Tutup
              </Button>
              <Button asChild>
                <Link href={`/laporan/${seasonId}`}>
                  <FileText className="size-4" aria-hidden />
                  Buka Laporan Musim
                </Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Tutup {seasonName}?</DialogTitle>
              <DialogDescription>
                Sesudah ditutup, sisa musim ini yang dibagi. Cek dulu yang di
                bawah supaya angkanya sudah benar.
              </DialogDescription>
            </DialogHeader>

            {checks === null || loading ? (
              <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Memeriksa musim ini…
              </p>
            ) : (
              <ul className="grid gap-2" aria-label="Daftar periksa tutup musim">
                {checks.map((check) => (
                  <li
                    key={check.key}
                    className={cn(
                      "grid gap-1 rounded-md border px-3 py-2",
                      !check.ok && "border-amber-500/40 bg-amber-500/5",
                    )}
                  >
                    <div className="flex items-start gap-2 text-sm">
                      {check.ok ? (
                        <CircleCheck
                          className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-label="Beres"
                        />
                      ) : (
                        <CircleAlert
                          className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                          aria-label="Belum beres"
                        />
                      )}
                      <span className={check.ok ? "text-muted-foreground" : "font-medium"}>
                        {check.title}
                      </span>
                    </div>
                    {check.ok ? null : (
                      <>
                        <p className="text-muted-foreground pl-6 text-xs">
                          {check.detail}
                        </p>
                        <Link
                          href={check.href}
                          className="pl-6 text-xs font-medium underline"
                          onClick={() => setOpen(false)}
                        >
                          {check.linkLabel}
                        </Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {checks !== null && !loading && !allClear ? (
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Bereskan dulu {pending.length} hal di atas. Musim baru bisa
                ditutup kalau semuanya sudah beres.
              </p>
            ) : null}

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={closing}
              >
                {allClear ? "Batal" : "Tutup"}
              </Button>
              <Button
                onClick={close}
                disabled={!allClear || loading || closing}
              >
                {closing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Menutup…
                  </>
                ) : (
                  "Tutup Musim"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
