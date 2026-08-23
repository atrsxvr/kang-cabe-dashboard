"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Field } from "@/components/common/form-field";
import { SubmitButton } from "@/components/common/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateGardenProfile } from "@/server/actions/settings";
import type { GardenProfileRow } from "@/server/queries/users";

/**
 * Things that are true of the whole garden, not of one planting: where it is,
 * and what size tank gets mixed. Repeating either per season would only invite
 * them to drift apart.
 */
export function GardenProfileForm({ profile }: { profile: GardenProfileRow }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const result = await updateGardenProfile(formData);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    setErrors({});
    toast.success("Profil kebun tersimpan.");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="py-5">
        <form action={onSubmit} className="grid gap-4">
          <Field id="garden-name" label="Nama Kebun" error={errors.name}>
            <Input
              id="garden-name"
              name="name"
              required
              defaultValue={profile.name}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field
            id="garden-locationName"
            label="Lokasi (opsional)"
            error={errors.locationName}
          >
            <Input
              id="garden-locationName"
              name="locationName"
              defaultValue={profile.locationName ?? ""}
              placeholder="Cisarua, Bogor"
              aria-invalid={Boolean(errors.locationName)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="garden-latitude" label="Lintang" error={errors.latitude}>
              <Input
                id="garden-latitude"
                name="latitude"
                inputMode="decimal"
                defaultValue={profile.latitude ?? ""}
                placeholder="-6.7"
                aria-invalid={Boolean(errors.latitude)}
              />
            </Field>

            <Field id="garden-longitude" label="Bujur" error={errors.longitude}>
              <Input
                id="garden-longitude"
                name="longitude"
                inputMode="decimal"
                defaultValue={profile.longitude ?? ""}
                placeholder="106.9"
                aria-invalid={Boolean(errors.longitude)}
              />
            </Field>
          </div>

          <p className="text-muted-foreground -mt-2 text-xs">
            Ambil dari Google Maps: klik kanan titik kebunnya, angka pertama
            lintang, kedua bujur. Dipakai buat memeriksa kode wilayah di bawah
            benar-benar nunjuk ke kebun.
          </p>

          <Field
            id="garden-bmkgAdm4"
            label="Kode Wilayah BMKG"
            error={errors.bmkgAdm4}
            hint="Ini yang bikin kartu cuaca jalan. BMKG minta kode kelurahan, bukan koordinat — dan nggak punya pencarinya, jadi kodenya diketik. Kalau salah, kartunya nyebut nama desa yang asing dan jaraknya dari kebun."
          >
            <Input
              id="garden-bmkgAdm4"
              name="bmkgAdm4"
              inputMode="numeric"
              defaultValue={profile.bmkgAdm4 ?? ""}
              placeholder="32.76.07.1005"
              aria-invalid={Boolean(errors.bmkgAdm4)}
            />
          </Field>

          <Field
            id="garden-defaultTankLitres"
            label="Volume Tangki Biasa (liter)"
            error={errors.defaultTankLitres}
            hint="Dipakai sebagai angka awal di kalkulator dosis"
          >
            <Input
              id="garden-defaultTankLitres"
              name="defaultTankLitres"
              type="number"
              min={1}
              step="any"
              required
              defaultValue={profile.defaultTankLitres}
              aria-invalid={Boolean(errors.defaultTankLitres)}
            />
          </Field>

          <div className="flex justify-end">
            <SubmitButton>Simpan Profil</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
