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
    return <span className="text-muted-foreground text-xs">Tahap akhir</span>;
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
      {/* Icon-only, like its neighbours. The arrow alone cannot say which
          stage comes next, so the label it used to carry lives in the tooltip
          and the accessible name instead — and the toast afterwards names the
          stage it moved to. */}
      <SubmitButton
        size="icon"
        variant="secondary"
        className="size-8"
        pendingLabel=""
        aria-label={`Ubah status ke ${labels[next]}`}
        title={`Ubah status ke ${labels[next]}`}
      >
        <ArrowRight className="size-4" aria-hidden />
      </SubmitButton>
    </form>
  );
}
