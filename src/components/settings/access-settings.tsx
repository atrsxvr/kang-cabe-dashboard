"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AREAS,
  DEFAULT_WRITERS,
  LOCKED_AREAS,
  areaLabels,
  roleLabels,
  type AccessMatrix,
  type Area,
  type Role,
} from "@/lib/permissions";
import { setRoleAccess } from "@/server/actions/access";

const ROLES: Exclude<Role, "ADMIN">[] = ["AGRONOMIST", "LOGISTICS", "SALES"];

/** Short enough for three columns on a 360px phone. */
const columnLabels: Record<(typeof ROLES)[number], string> = {
  AGRONOMIST: "Agronomis",
  LOGISTICS: "Logistik",
  SALES: "Penjualan",
};

const EDITABLE = AREAS.filter((area) => !LOCKED_AREAS.includes(area));

/**
 * Akses Peran: which role may change what, ticked by Admin.
 *
 * Reading is not governed here — every member can read every page. What a
 * tick grants is the buttons, and the Server Actions behind them, which read
 * the same table on every request.
 */
export function AccessSettings({
  access,
  editable,
}: {
  access: AccessMatrix;
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  const toggle = (role: Role, area: Area, on: boolean) => {
    const key = `${role}:${area}`;
    setSaving(key);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("role", role);
      formData.set("area", area);
      formData.set("allowed", String(on));

      const result = await setRoleAccess(formData);
      if (!result.ok) {
        toast.error(result.message);
      } else {
        toast.success(
          `${roleLabels[role]} ${on ? "sekarang boleh" : "tidak lagi boleh"} mengubah ${areaLabels[area].toLowerCase()}.`
        );
        router.refresh();
      }
      setSaving(null);
    });
  };

  return (
    <Card className="py-3" id="akses">
      <CardContent className="grid gap-3 px-4">
        <p className="text-muted-foreground text-xs">
          Centang = boleh menambah dan mengubah di bagian itu. Semua anggota
          tetap bisa melihat semua halaman.{" "}
          Perubahan berlaku seketika.
        </p>

        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="py-1 pr-2 text-left font-medium">Bagian</th>
                {ROLES.map((role) => (
                  <th key={role} className="w-16 px-1 py-1 text-center font-medium">
                    {columnLabels[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EDITABLE.map((area) => (
                <tr key={area} className="border-t">
                  <td className="py-2 pr-2 leading-snug">{areaLabels[area]}</td>
                  {ROLES.map((role) => {
                    const on = access[area].includes(role);
                    const changed = on !== DEFAULT_WRITERS[area].includes(role);
                    const label = `${columnLabels[role]} — ${areaLabels[area]}`;
                    return (
                      <td key={role} className="px-1 py-1 text-center">
                        {/* A 32px target around a 16px box: tapped one-handed. */}
                        <label className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md">
                          <Checkbox
                            checked={on}
                            disabled={!editable || (pending && saving === `${role}:${area}`)}
                            aria-label={label}
                            onCheckedChange={(next) => toggle(role, area, next === true)}
                          />
                          {changed ? <span className="sr-only">(diubah dari bawaan)</span> : null}
                        </label>
                        {changed ? (
                          <span
                            className="block text-[10px] leading-none text-amber-700 dark:text-amber-400"
                            aria-hidden
                          >
                            diubah
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted-foreground flex gap-1.5 text-xs">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Admin selalu boleh semuanya. {areaLabels.settings} hanya Admin, dan
            Tutup Musim hanya Admin — memberi bagian Musim tidak ikut memberi
            hak menutupnya. Notifikasi diatur tiap anggota di HP-nya sendiri.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
