import type { Metadata } from "next";
import { connection } from "next/server";
import { ShieldAlert } from "lucide-react";

import { CanWrite } from "@/components/auth/can-write";
import { PageHeader } from "@/components/common/page-header";
import { GardenProfileForm } from "@/components/settings/garden-profile-form";
import { MemberActiveAction } from "@/components/settings/member-active-action";
import { MemberDialog } from "@/components/settings/member-dialog";
import {
  roleDescriptions,
  roleLabels,
  roleTones,
} from "@/components/settings/settings-labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { capitalSummary } from "@/server/queries/capital";
import { formatRupiah } from "@/lib/money";
import { getGardenProfile, listMembers } from "@/server/queries/users";

export const metadata: Metadata = { title: "Settings & Users" };

export default async function SettingsPage() {
  // Not season-scoped, and read fresh: members and the garden profile change
  // rarely but must never be served from a build-time snapshot.
  await connection();

  const [members, profile, capital] = await Promise.all([
    listMembers(),
    getGardenProfile(),
    capitalSummary(),
  ]);

  const paidIn = new Map(capital.contributors.map((row) => [row.id, row]));

  const active = members.filter((member) => !member.deletedAt);
  const inactive = members.filter((member) => member.deletedAt);
  const totalShare = active.reduce((sum, m) => sum + m.profitShare, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Settings & Users"
          description="Anggota tim, porsi bagi hasil, dan profil kebun."
        />
        <CanWrite area="settings">
          <MemberDialog />
        </CanWrite>
      </div>

      {/* Said plainly rather than implied. The roles below look like access
          control and are not, and someone will assume otherwise. */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Belum ada login. Perannya di bawah ini kesepakatan kerja, belum
          ditegakkan aplikasi — siapa pun yang buka halaman ini bisa mengubah
          apa saja. Jangan ditaruh di internet sebelum autentikasi terpasang.
        </p>
      </div>

      <section className="mb-8 grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Anggota Aktif</h2>
          <p className="text-muted-foreground text-xs tabular-nums">
            Modal terkumpul {formatRupiah(capital.total)}
          </p>
          <p
            className={cn(
              "text-xs tabular-nums",
              totalShare === 100
                ? "text-muted-foreground"
                : "text-amber-700 dark:text-amber-400"
            )}
          >
            Total porsi bagi hasil {totalShare}%
            {totalShare === 100 ? "" : " — belum genap 100%"}
          </p>
        </div>

        {active.map((member) => (
          <Card key={member.id} className="py-3">
            <CardContent className="flex flex-wrap items-center gap-3 px-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{member.name}</p>
                <p className="text-muted-foreground text-xs">{member.email}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {member.counts.tasks} tugas · {member.counts.harvests} panen ·{" "}
                  {member.counts.sales} penjualan
                </p>
                <p className="mt-1 text-xs tabular-nums">
                  Modal disetor{" "}
                  <strong>
                    {formatRupiah(paidIn.get(member.id)?.total ?? 0)}
                  </strong>
                  <span className="text-muted-foreground">
                    {" "}
                    · {paidIn.get(member.id)?.capitalShare ?? 0}% dari total
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="secondary"
                  className={cn("border-transparent", roleTones[member.role])}
                >
                  {roleLabels[member.role]}
                </Badge>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {member.profitShare}% bagi hasil
                </span>
              </div>

              <div className="flex w-full items-center gap-1 border-t pt-2 sm:w-auto sm:border-0 sm:pt-0">
                <CanWrite area="settings">
                  <MemberDialog member={member} />
                </CanWrite>
                <MemberActiveAction member={member} />
              </div>
            </CardContent>
          </Card>
        ))}

        <p className="text-muted-foreground text-xs">
          {roleLabels.ADMIN}: {roleDescriptions.ADMIN} · {roleLabels.AGRONOMIST}
          : {roleDescriptions.AGRONOMIST} · {roleLabels.LOGISTICS}:{" "}
          {roleDescriptions.LOGISTICS} · {roleLabels.SALES}:{" "}
          {roleDescriptions.SALES}
        </p>
      </section>

      {inactive.length > 0 ? (
        <section className="mb-8 grid gap-3">
          <h2 className="text-sm font-medium">Nonaktif</h2>
          {inactive.map((member) => (
            <Card key={member.id} className="py-3 opacity-70">
              <CardContent className="flex flex-wrap items-center gap-3 px-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-muted-foreground text-xs">
                    Jejaknya tetap tersimpan: {member.counts.tasks} tugas,{" "}
                    {member.counts.harvests} panen, {member.counts.sales}{" "}
                    penjualan.
                  </p>
                </div>
                <MemberActiveAction member={member} />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">Profil Kebun</h2>
        <GardenProfileForm profile={profile} />
      </section>
    </>
  );
}
