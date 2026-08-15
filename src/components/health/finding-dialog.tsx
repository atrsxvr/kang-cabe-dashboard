"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { SubmitButton } from "@/components/common/submit-button";
import { severityLabels } from "@/components/health/finding-labels";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downscaleImage } from "@/lib/downscale-image";
import { createFinding, updateFinding } from "@/server/actions/findings";
import type { FindingRow } from "@/server/queries/findings";
import type { MemberOption } from "@/server/queries/users";

export function FindingDialog({
  seasonId,
  members,
  currentHst,
  photoEnabled,
  finding,
}: {
  seasonId: string;
  members: MemberOption[];
  currentHst: number;
  photoEnabled: boolean;
  finding?: FindingRow;
}) {
  const editing = Boolean(finding);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /**
   * The chosen file is held here rather than read back off the input at submit
   * time: React resets a form once its action returns, including on a
   * validation error, which empties the input while the preview stays put.
   */
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const choosePhoto = (file: File | null) => {
    setPhoto(file);
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const resetForm = () => {
    setErrors({});
    choosePhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  async function onSubmit(formData: FormData) {
    // Shrink before the request leaves the phone; a raw camera file is several
    // megabytes and would crawl over a field connection.
    if (photo) formData.set("photo", await downscaleImage(photo));
    else formData.delete("photo");

    const result = editing
      ? await updateFinding(formData)
      : await createFinding(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    resetForm();
    setOpen(false);
    toast.success(
      editing
        ? "Temuan diperbarui."
        : "Temuan dicatat. Menunggu diagnosa Agronomis.",
    );
    router.refresh();
  }

  const close = () => {
    setOpen(false);
    resetForm();
  };

  // Editing shows what is already attached until a replacement is picked.
  const shownPhoto = preview ?? (editing ? finding!.photoUrl : null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            aria-label="Edit temuan"
          >
            <Pencil className="size-4" aria-hidden />
            Edit
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Catat Temuan
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Temuan" : "Catat Temuan di Kebun"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Diagnosa dan perlakuan diubah lewat tombol Diagnosa."
              : "Cukup jelaskan yang kamu lihat. Diagnosa dan perlakuan diisi Agronomis setelah ini."}
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />
          {editing ? (
            <input type="hidden" name="findingId" value={finding!.id} />
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="photo">Foto</Label>
            {photoEnabled ? (
              <>
                <input
                  ref={fileRef}
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/*"
                  // Opens the camera directly on a phone rather than the
                  // gallery — this form is filled standing in the field.
                  capture="environment"
                  className="sr-only"
                  onChange={(event) =>
                    choosePhoto(event.target.files?.[0] ?? null)
                  }
                />
                {shownPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shownPhoto}
                    alt={
                      preview ? "Pratinjau foto temuan" : "Foto temuan saat ini"
                    }
                    className="max-h-48 w-full rounded-md border object-cover"
                  />
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="size-4" aria-hidden />
                  {shownPhoto ? "Ganti foto" : "Ambil / pilih foto"}
                </Button>
                {editing && finding!.photoUrl && !preview ? (
                  <p className="text-muted-foreground text-xs">
                    Biarkan saja kalau fotonya tidak berubah.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
                Unggah foto belum aktif — <code>SUPABASE_SERVICE_ROLE_KEY</code>{" "}
                belum diset di <code>.env</code>. Temuan tetap bisa dicatat
                tanpa foto.
              </p>
            )}
          </div>

          <Field
            id="symptoms"
            label="Gejala yang terlihat"
            error={errors.symptoms}
          >
            <Textarea
              id="symptoms"
              name="symptoms"
              rows={3}
              required
              defaultValue={finding?.symptoms}
              placeholder="Daun menguning dari bawah, ada bercak coklat di beberapa tanaman…"
              aria-invalid={Boolean(errors.symptoms)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="severity"
              label="Tingkat keparahan"
              error={errors.severity}
            >
              <NativeSelect
                id="severity"
                name="severity"
                defaultValue={finding?.severity ?? "MEDIUM"}
              >
                {Object.entries(severityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field
              id="hst"
              label="HST saat ditemukan"
              error={errors.hst}
              hint="Terisi otomatis dari musim"
            >
              <Input
                id="hst"
                name="hst"
                type="number"
                min={0}
                required
                defaultValue={finding?.hst ?? currentHst}
                aria-invalid={Boolean(errors.hst)}
              />
            </Field>
          </div>

          <Field
            id="location"
            label="Lokasi / petak (opsional)"
            error={errors.location}
          >
            <Input
              id="location"
              name="location"
              defaultValue={finding?.location ?? ""}
              placeholder="Blok A baris 3"
            />
          </Field>

          <Field
            id="reportedById"
            label="Ditemukan oleh"
            error={errors.reportedById}
          >
            <NativeSelect
              id="reportedById"
              name="reportedById"
              defaultValue={finding?.reportedBy?.id ?? ""}
            >
              <option value="">— tidak disebutkan —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={close}>
              Batal
            </Button>
            <SubmitButton pendingLabel="Menyimpan…">
              {editing ? "Simpan Perubahan" : "Simpan Temuan"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
