import { Wrench } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import {
  serviceStatusLabels,
  serviceStatusTones,
  toolConditionLabels,
  toolConditionTones,
} from "@/components/inventory/inventory-labels";
import { ToolDialog } from "@/components/inventory/tool-dialog";
import { ToolEventDialog } from "@/components/inventory/tool-event-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/hst";
import { nextServiceDate, serviceStatus } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { deleteTool } from "@/server/actions/inventory";
import type { ToolRow } from "@/server/queries/inventory";
import type { MemberOption } from "@/server/queries/users";

export function ToolList({
  tools,
  members,
}: {
  tools: ToolRow[];
  members: MemberOption[];
}) {
  if (tools.length === 0) return <EmptyTools />;

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {tools.map((tool) => (
          <Card key={tool.id} className="py-3">
            <CardContent className="grid gap-2 px-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {tool.name}
                    {tool.quantity > 1 ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ×{tool.quantity}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {tool.lastServicedAt
                      ? `Servis terakhir ${formatDate(tool.lastServicedAt)}`
                      : "Belum pernah diservis"}
                  </p>
                  <ServiceNote tool={tool} />
                  <HolderNote tool={tool} />
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "shrink-0 border-transparent",
                    toolConditionTones[tool.condition],
                  )}
                >
                  {toolConditionLabels[tool.condition]}
                </Badge>
              </div>

              {tool.notes ? (
                <p className="text-muted-foreground text-xs">{tool.notes}</p>
              ) : null}

              <div className="flex items-center gap-1 border-t pt-2">
                <ToolEventDialog tool={tool} members={members} />
                <ToolDialog tool={tool} />
                <ConfirmDelete
                  title="Hapus alat ini?"
                  itemName={tool.name}
                  action={deleteTool}
                  fields={{ toolId: tool.id }}
                  iconOnly
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden py-0 md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Alat</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="w-32">Kondisi</TableHead>
                <TableHead>Dipegang</TableHead>
                <TableHead>Servis</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="w-32 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell className="font-medium">{tool.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {tool.quantity === 0 ? (
                      <span className="text-rose-700 dark:text-rose-400">
                        0
                      </span>
                    ) : (
                      tool.quantity
                    )}
                  </TableCell>
                  <TableCell className="w-32">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "w-full justify-center border-transparent",
                        toolConditionTones[tool.condition],
                      )}
                    >
                      {toolConditionLabels[tool.condition]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {tool.heldBy?.name ?? "di gudang"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <ServiceCell tool={tool} />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-64 truncate text-sm">
                    {tool.notes ?? "—"}
                  </TableCell>
                  <TableCell className="w-32">
                    <div className="flex items-center justify-end gap-1">
                      <ToolEventDialog tool={tool} members={members} />
                      <ToolDialog tool={tool} />
                      <ConfirmDelete
                        title="Hapus alat ini?"
                        itemName={tool.name}
                        action={deleteTool}
                        fields={{ toolId: tool.id }}
                        iconOnly
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}

/** Only appears for a tool that has a schedule to be measured against. */
function ServiceNote({ tool }: { tool: ToolRow }) {
  const status = serviceStatus(tool.lastServicedAt, tool.serviceIntervalDays);
  if (status === "NONE" || status === "OK") return null;

  return (
    <p
      className={cn(
        "text-xs",
        status === "OVERDUE"
          ? "text-rose-700 dark:text-rose-400"
          : "text-amber-700 dark:text-amber-400",
      )}
    >
      {serviceStatusLabels[status]}
    </p>
  );
}

function HolderNote({ tool }: { tool: ToolRow }) {
  if (!tool.heldBy) return null;

  return (
    <p className="text-muted-foreground text-xs">Dibawa {tool.heldBy.name}</p>
  );
}

function ServiceCell({ tool }: { tool: ToolRow }) {
  const status = serviceStatus(tool.lastServicedAt, tool.serviceIntervalDays);

  if (status === "NONE") {
    return (
      <span className="text-muted-foreground text-sm">
        {tool.lastServicedAt ? formatDate(tool.lastServicedAt) : "—"}
      </span>
    );
  }

  const due = nextServiceDate(tool.lastServicedAt, tool.serviceIntervalDays);

  return (
    <div className="grid gap-0.5">
      <Badge
        variant="secondary"
        className={cn("w-fit border-transparent", serviceStatusTones[status])}
      >
        {serviceStatusLabels[status]}
      </Badge>
      <span className="text-muted-foreground text-xs">
        {due ? formatDate(due) : "belum pernah diservis"}
      </span>
    </div>
  );
}

function EmptyTools() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="bg-muted rounded-lg p-3">
          <Wrench className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div>
          <p className="font-medium">Belum ada alat terdaftar</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Catat tangki semprot, cangkul, gembor, dan selang agar kondisinya
            terpantau.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
