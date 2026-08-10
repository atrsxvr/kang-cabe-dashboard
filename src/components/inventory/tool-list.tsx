import { Wrench } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import {
  toolConditionLabels,
  toolConditionTones,
} from "@/components/inventory/inventory-labels";
import { ToolDialog } from "@/components/inventory/tool-dialog";
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
import { cn } from "@/lib/utils";
import { deleteTool } from "@/server/actions/inventory";
import type { ToolRow } from "@/server/queries/inventory";

export function ToolList({ tools }: { tools: ToolRow[] }) {
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
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "shrink-0 border-transparent",
                    toolConditionTones[tool.condition]
                  )}
                >
                  {toolConditionLabels[tool.condition]}
                </Badge>
              </div>

              {tool.notes ? (
                <p className="text-muted-foreground text-xs">{tool.notes}</p>
              ) : null}

              <div className="flex items-center gap-1 border-t pt-2">
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
                <TableHead>Servis Terakhir</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell className="font-medium">{tool.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {tool.quantity}
                  </TableCell>
                  <TableCell className="w-32">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "w-full justify-center border-transparent",
                        toolConditionTones[tool.condition]
                      )}
                    >
                      {toolConditionLabels[tool.condition]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {tool.lastServicedAt
                      ? formatDate(tool.lastServicedAt)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-64 truncate text-sm">
                    {tool.notes ?? "—"}
                  </TableCell>
                  <TableCell className="w-24">
                    <div className="flex items-center justify-end gap-0.5">
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
