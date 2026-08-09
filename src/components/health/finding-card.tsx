import { ImageIcon, MapPin, User as UserIcon } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import { DiagnoseDialog } from "@/components/health/diagnose-dialog";
import { FindingDialog } from "@/components/health/finding-dialog";
import { PhotoViewer } from "@/components/health/photo-viewer";
import { FindingStatusAction } from "@/components/health/finding-status-action";
import {
  findingStatusLabels,
  findingStatusTones,
  severityLabels,
  severityTones,
} from "@/components/health/finding-labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/hst";
import { cn } from "@/lib/utils";
import { deleteFinding } from "@/server/actions/findings";
import type { FindingRow } from "@/server/queries/findings";
import type { RecipeRow } from "@/server/queries/recipes";
import type { MemberOption } from "@/server/queries/users";

export function FindingCard({
  finding,
  seasonId,
  members,
  treatmentRecipes,
  currentHst,
  photoEnabled,
}: {
  finding: FindingRow;
  seasonId: string;
  members: MemberOption[];
  treatmentRecipes: RecipeRow[];
  currentHst: number;
  photoEnabled: boolean;
}) {
  return (
    <Card className="overflow-hidden py-0">
      <div>
        <CardContent className="min-w-0 flex-1 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("border-transparent", findingStatusTones[finding.status])}
            >
              {findingStatusLabels[finding.status]}
            </Badge>
            <Badge
              variant="secondary"
              className={cn("border-transparent", severityTones[finding.severity])}
            >
              {severityLabels[finding.severity]}
            </Badge>
            <span className="text-muted-foreground text-xs tabular-nums">
              HST {finding.hst}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatDate(finding.createdAt)}
            </span>
          </div>

          <p className="text-sm">{finding.symptoms}</p>

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {finding.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {finding.location}
              </span>
            ) : null}
            {finding.reportedBy ? (
              <span className="inline-flex items-center gap-1">
                <UserIcon className="size-3.5" aria-hidden />
                {finding.reportedBy.name}
              </span>
            ) : null}
            {finding.photoUrl ? (
              // Not the photo itself — a way in. A resolved finding has no
              // diagnose button, and without this its photo would be
              // unreachable from the app entirely.
              <PhotoViewer
                src={finding.photoUrl}
                caption={`Temuan HST ${finding.hst}${finding.location ? ` · ${finding.location}` : ""}`}
              >
                <button
                  type="button"
                  className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  <ImageIcon className="size-3.5" aria-hidden />
                  Lihat foto
                </button>
              </PhotoViewer>
            ) : null}
          </div>

          {finding.diagnosis ? (
            <div className="bg-muted/50 mt-3 grid gap-2 rounded-md border p-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  Diagnosa
                  {finding.diagnosedBy ? ` · ${finding.diagnosedBy.name}` : null}
                </p>
                <p>{finding.diagnosis}</p>
              </div>
              {finding.treatment ? (
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Perlakuan
                  </p>
                  {/* Recipes are written in as a list, so the breaks matter. */}
                  <p className="whitespace-pre-line">{finding.treatment}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {finding.status !== "RESOLVED" ? (
              <DiagnoseDialog
                finding={finding}
                seasonId={seasonId}
                members={members}
                treatmentRecipes={treatmentRecipes}
              />
            ) : null}
            <FindingStatusAction
              findingId={finding.id}
              seasonId={seasonId}
              status={finding.status}
            />
            <div className="ml-auto flex items-center gap-1">
              <FindingDialog
                seasonId={seasonId}
                members={members}
                currentHst={currentHst}
                photoEnabled={photoEnabled}
                finding={finding}
              />
              <ConfirmDelete
                title="Hapus temuan ini?"
                itemName={finding.symptoms.slice(0, 60)}
                consequence={
                  finding.photoUrl ? "fotonya ikut terhapus." : undefined
                }
                action={deleteFinding}
                fields={{ findingId: finding.id, seasonId }}
                iconOnly
              />
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
