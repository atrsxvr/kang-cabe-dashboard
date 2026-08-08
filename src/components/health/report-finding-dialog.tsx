"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus } from "lucide-react";
import { toast } from "sonner";

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
import { createFinding } from "@/server/actions/findings";
import type { MemberOption } from "@/server/queries/users";

export function ReportFindingDialog({
  seasonId,
  members,
  currentHst,
  photoEnabled,
}: {
  seasonId: string;
  members: MemberOption[];
  currentHst: number;
  photoEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const file = formData.get("photo");

    // Shrink before the request leaves the phone; a raw camera file is several
    // megabytes and would crawl over a field connection.
    if (file instanceof File && file.size > 0) {
      formData.set("photo", await downscaleImage(file));
    }

    const result = await createFinding(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setPreview(null);
    setOpen(false);
    toast.success("Temuan dicatat. Menunggu diagnosa Agronomis.");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setErrors({});
          setPreview(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden />
          Catat Temuan
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Temuan di Kebun</DialogTitle>
          <DialogDescription>
            Cukup jelaskan yang kamu lihat. Diagnosa dan perlakuan diisi
            Agronomis setelah ini.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="seasonId" value={seasonId} />

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
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Pratinjau foto temuan"
                    className="max-h-48 w-full rounded-md border object-cover"
                  />
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="size-4" aria-hidden />
                  {preview ? "Ganti foto" : "Ambil / pilih foto"}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
                Unggah foto belum aktif — <code>SUPABASE_SERVICE_ROLE_KEY</code>{" "}
                belum diset di <code>.env</code>. Temuan tetap bisa dicatat
                tanpa foto.
              </p>
            )}
          </div>

          <Field id="symptoms" label="Gejala yang terlihat" error={errors.symptoms}>
            <Textarea
              id="symptoms"
              name="symptoms"
              rows={3}
              required
              placeholder="Daun menguning dari bawah, ada bercak coklat di beberapa tanaman…"
              aria-invalid={Boolean(errors.symptoms)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="severity" label="Tingkat keparahan" error={errors.severity}>
              <NativeSelect
                id="severity"
                name="severity"
                defaultValue="MEDIUM"
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
                defaultValue={currentHst}
                aria-invalid={Boolean(errors.hst)}
              />
            </Field>
          </div>

          <Field id="location" label="Lokasi / petak (opsional)" error={errors.location}>
            <Input id="location" name="location" placeholder="Blok A baris 3" />
          </Field>

          <Field id="reportedById" label="Ditemukan oleh" error={errors.reportedById}>
            <NativeSelect
              id="reportedById"
              name="reportedById"
              defaultValue=""
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton pendingLabel="Mengunggah…">
              Simpan Temuan
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    // content-start: a sibling Field carrying a hint is taller, and a stretched
    // grid would widen this one's gaps instead, pushing its control out of line.
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
