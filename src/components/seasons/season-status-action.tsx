"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/common/submit-button";
import { advanceSeasonStatus } from "@/server/actions/seasons";
import {
  nextSeasonStatus,
  type seasonStatuses,
} from "@/server/actions/schemas";

const labels: Record<string, string> = {
  PLANNING: "Perencanaan",
  ACTIVE: "Berjalan",
  HARVESTING: "Panen",
  COMPLETED: "Selesai",
  ARCHIVED: "Arsip",
};

export function SeasonStatusAction({
  seasonId,
  status,
}: {
  seasonId: string;
  status: (typeof seasonStatuses)[number];
}) {
  const router = useRouter();
  const next = nextSeasonStatus(status);

  if (!next) {
    return status === "COMPLETED" ? (
      <span className="text-muted-foreground text-xs">Tahap akhir</span>
    ) : null;
  }

  async function onSubmit(formData: FormData) {
    const result = await advanceSeasonStatus(formData);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(`Status diubah ke ${labels[next!]}.`);
    router.refresh();
  }

  return (
    <form action={onSubmit}>
      <input type="hidden" name="seasonId" value={seasonId} />
      {/* The only one of the three that keeps its word. Edit and Arsipkan are
          guessable from a pencil and a box; "move to the next stage" is not,
          because the stage it moves to changes with the row — and on a phone
          there is no hover to ask. */}
      <SubmitButton
        size="sm"
        variant="secondary"
        className="h-8"
        pendingLabel="Mengubah…"
        title={`Ubah status ke ${labels[next]}`}
      >
        <ArrowRight className="size-3.5" aria-hidden />
        {labels[next]}
      </SubmitButton>
    </form>
  );
}
