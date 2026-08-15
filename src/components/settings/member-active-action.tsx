"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deactivateMember } from "@/server/actions/settings";
import type { MemberRow } from "@/server/queries/users";

/**
 * Deactivate, not delete.
 *
 * A member's name hangs off tasks, findings, harvests, sales and every stock
 * movement they recorded. Removing the row would either take that history with
 * it or leave it unattributable, and the point of recording who did what is
 * that it stays answerable months later.
 */
export function MemberActiveAction({ member }: { member: MemberRow }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const inactive = Boolean(member.deletedAt);

  const submit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("memberId", member.id);
      if (inactive) formData.set("restore", "true");

      const result = await deactivateMember(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        inactive
          ? `${member.name} aktif lagi.`
          : `${member.name} dinonaktifkan.`,
      );
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={submit}
      className={inactive ? undefined : "text-muted-foreground"}
    >
      {inactive ? (
        <>
          <UserRoundCheck className="size-4" aria-hidden />
          Aktifkan
        </>
      ) : (
        <>
          <UserMinus className="size-4" aria-hidden />
          Nonaktifkan
        </>
      )}
    </Button>
  );
}
