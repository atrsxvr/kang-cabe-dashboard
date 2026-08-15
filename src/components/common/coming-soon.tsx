import { Construction } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";

/** Placeholder for the modules Sprint 1 does not build yet. */
export function ComingSoon({
  title,
  description,
  scope,
}: {
  title: string;
  description: string;
  scope: string[];
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-start gap-4 py-10 sm:flex-row sm:items-center">
          <div className="bg-muted rounded-lg p-3">
            <Construction
              className="text-muted-foreground size-6"
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Segera hadir</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Modul ini belum dibangun. Rencana cakupannya:
            </p>
            <ul className="text-muted-foreground mt-3 list-inside list-disc space-y-1 text-sm">
              {scope.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
