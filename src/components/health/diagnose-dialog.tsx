"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, ZoomIn } from "lucide-react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/common/native-select";
import { PhotoViewer } from "@/components/health/photo-viewer";
import { TreatmentPicker } from "@/components/health/treatment-picker";
import { SubmitButton } from "@/components/common/submit-button";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { diagnoseFinding } from "@/server/actions/findings";
import type { FindingRow } from "@/server/queries/findings";
import type { RecipeRow } from "@/server/queries/recipes";
import type { MemberOption } from "@/server/queries/users";

export function DiagnoseDialog({
  finding,
  seasonId,
  members,
  treatmentRecipes,
}: {
  finding: FindingRow;
  seasonId: string;
  members: MemberOption[];
  treatmentRecipes: RecipeRow[];
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Controlled so the recipe picker can write into it.
  const [treatment, setTreatment] = useState(finding.treatment ?? "");
  const router = useRouter();

  // Agronomists first: this form is theirs, so their name should be the
  // default rather than buried in the list.
  const sorted = [...members].sort((a, b) =>
    a.role === "AGRONOMIST" ? -1 : b.role === "AGRONOMIST" ? 1 : 0
  );

  async function onSubmit(formData: FormData) {
    const result = await diagnoseFinding(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    setOpen(false);
    toast.success("Diagnosa tersimpan. Temuan menunggu penanganan.");
    router.refresh();
  }

  const isUpdate = finding.status !== "REPORTED";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setErrors({});
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant={isUpdate ? "ghost" : "default"}>
          <Stethoscope className="size-4" aria-hidden />
          {isUpdate ? "Ubah diagnosa" : "Diagnosa"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Diagnosa & Perlakuan</DialogTitle>
          <DialogDescription>
            Temuan HST {finding.hst}
            {finding.location ? ` · ${finding.location}` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-md border p-3 text-sm">
          <p className="text-muted-foreground mb-1 text-xs font-medium">
            Gejala yang dilaporkan
          </p>
          <p>{finding.symptoms}</p>
        </div>

        {finding.photoUrl ? (
          <PhotoViewer
            src={finding.photoUrl}
            caption={`Temuan HST ${finding.hst}${finding.location ? ` · ${finding.location}` : ""}`}
          >
            <button
              type="button"
              className="focus-visible:ring-ring group relative block w-full overflow-hidden rounded-md border focus-visible:ring-2 focus-visible:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={finding.photoUrl}
                alt="Foto temuan"
                className="max-h-56 w-full object-cover"
              />
              <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs text-white">
                <ZoomIn className="size-3.5" aria-hidden />
                Perbesar
              </span>
            </button>
          </PhotoViewer>
        ) : null}

        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="findingId" value={finding.id} />
          <input type="hidden" name="seasonId" value={seasonId} />

          <div className="grid gap-2">
            <Label htmlFor={`diagnosis-${finding.id}`}>Diagnosa</Label>
            <Textarea
              id={`diagnosis-${finding.id}`}
              name="diagnosis"
              rows={2}
              required
              defaultValue={finding.diagnosis ?? ""}
              placeholder="Antraknosa, kemungkinan dipicu kelembapan tinggi"
              aria-invalid={Boolean(errors.diagnosis)}
            />
            {errors.diagnosis ? (
              <p className="text-destructive text-xs" role="alert">
                {errors.diagnosis}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`treatment-${finding.id}`}>
              Perlakuan yang disarankan
            </Label>
            <TreatmentPicker
              recipes={treatmentRecipes}
              onApply={(text) =>
                setTreatment((current) =>
                  current.trim() ? `${current.trim()}\n\n${text}` : text
                )
              }
            />
            <Textarea
              id={`treatment-${finding.id}`}
              name="treatment"
              rows={5}
              required
              value={treatment}
              onChange={(event) => setTreatment(event.target.value)}
              placeholder="Semprot fungisida berbahan aktif azoksistrobin, 2 ml/L, ulangi 7 hari"
              aria-invalid={Boolean(errors.treatment)}
            />
            {errors.treatment ? (
              <p className="text-destructive text-xs" role="alert">
                {errors.treatment}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`diagnosedById-${finding.id}`}>Didiagnosa oleh</Label>
            <NativeSelect
              id={`diagnosedById-${finding.id}`}
              name="diagnosedById"
              defaultValue={finding.diagnosedBy?.id ?? sorted[0]?.id ?? ""}
            >
              <option value="">— tidak disebutkan —</option>
              {sorted.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton>Simpan Diagnosa</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
