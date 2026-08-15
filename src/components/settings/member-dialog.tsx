"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import {
  roleDescriptions,
  roleLabels,
} from "@/components/settings/settings-labels";
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
import { Input } from "@/components/ui/input";
import { createMember, updateMember } from "@/server/actions/settings";
import type { MemberRow } from "@/server/queries/users";

const ROLES = ["ADMIN", "AGRONOMIST", "LOGISTICS", "SALES"] as const;

export function MemberDialog({ member }: { member?: MemberRow }) {
  const editing = Boolean(member);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string>(member?.role ?? "ADMIN");
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = editing
      ? await updateMember(formData)
      : await createMember(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success(editing ? "Anggota diperbarui." : "Anggota ditambahkan.");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setErrors({});
          setRole(member?.role ?? "ADMIN");
        }
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="sm" aria-label={`Edit ${member!.name}`}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button size="sm">
            <UserPlus className="size-4" aria-hidden />
            Tambah Anggota
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Anggota" : "Tambah Anggota"}
          </DialogTitle>
          <DialogDescription>
            Perannya belum ditegakkan sistem — belum ada login. Ini kesepakatan
            kerja, dan nanti jadi dasar hak akses.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          {editing ? (
            <input type="hidden" name="memberId" value={member!.id} />
          ) : null}

          <Field id="member-name" label="Nama" error={errors.name}>
            <Input
              id="member-name"
              name="name"
              required
              defaultValue={member?.name}
              placeholder="Gotay"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field id="member-email" label="Email" error={errors.email}>
            <Input
              id="member-email"
              name="email"
              type="email"
              required
              defaultValue={member?.email}
              placeholder="logistik@kangcabe.id"
              aria-invalid={Boolean(errors.email)}
            />
          </Field>

          <Field id="member-role" label="Peran" error={errors.role}>
            <NativeSelect
              id="member-role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {roleLabels[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <p className="text-muted-foreground -mt-2 text-xs">
            {roleDescriptions[role]}
          </p>

          <Field
            id="member-profitShare"
            label="Porsi Bagi Hasil (%)"
            error={errors.profitShare}
            hint="Boleh dikosongkan dulu. Totalnya nggak dipaksa 100 — selisihnya ditampilkan apa adanya."
          >
            <Input
              id="member-profitShare"
              name="profitShare"
              type="number"
              min={0}
              max={100}
              step="any"
              defaultValue={member?.profitShare ?? 0}
              aria-invalid={Boolean(errors.profitShare)}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>
              {editing ? "Simpan Perubahan" : "Simpan Anggota"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
