import { MapPin, User as UserIcon } from "lucide-react";

import { DiagnoseDialog } from "@/components/health/diagnose-dialog";
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
import type { FindingRow } from "@/server/queries/findings";
import type { MemberOption } from "@/server/queries/users";

export function FindingCard({
  finding,
  seasonId,
  members,
}: {
  finding: FindingRow;
  seasonId: string;
  members: MemberOption[];
}) {
  return (
    <Card className="overflow-hidden py-0">
      <div className="sm:flex">
        {finding.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={finding.photoUrl}
            alt={`Foto temuan HST ${finding.hst}`}
            loading="lazy"
            className="h-44 w-full object-cover sm:h-auto sm:w-44 sm:shrink-0"
          />
        ) : null}

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
                  <p>{finding.treatment}</p>
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
              />
            ) : null}
            <FindingStatusAction
              findingId={finding.id}
              seasonId={seasonId}
              status={finding.status}
            />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
