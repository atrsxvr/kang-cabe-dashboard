"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { findingStatusLabels } from "@/components/health/finding-labels";
import { Button } from "@/components/ui/button";
import { updateFindingStatus } from "@/server/actions/findings";
import { findingStatuses } from "@/server/actions/schemas";

type Status = (typeof findingStatuses)[number];

/** Keyed by the status being moved *to*, not the current one. */
const nextLabel: Partial<Record<Status, string>> = {
  TREATED: "Tandai ditangani",
  RESOLVED: "Tandai selesai",
};

export function FindingStatusAction({
  findingId,
  seasonId,
  status,
}: {
  findingId: string;
  seasonId: string;
  status: Status;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // REPORTED has no button: it advances by being diagnosed, not by a status
  // flip, so the only way forward is the diagnose form.
  const index = findingStatuses.indexOf(status);
  const next =
    status === "REPORTED" || index === findingStatuses.length - 1
      ? null
      : findingStatuses[index + 1];

  if (!next) return null;

  const move = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("findingId", findingId);
      formData.set("seasonId", seasonId);
      formData.set("status", next);

      const result = await updateFindingStatus(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`Status: ${findingStatusLabels[next]}.`);
      router.refresh();
    });
  };

  return (
    <Button size="sm" variant="secondary" disabled={pending} onClick={move}>
      <ArrowRight className="size-3.5" aria-hidden />
      {nextLabel[next] ?? findingStatusLabels[next]}
    </Button>
  );
}
