import type { NextRequest } from "next/server";

import { SEASON_PARAM } from "@/lib/season-param";
import { currentActor } from "@/server/auth/guard";
import {
  buildExport,
  EXPORT_KINDS,
  isSeasonScoped,
  type ExportKind,
} from "@/server/export";
import { getSeason } from "@/server/queries/seasons";

/**
 * Downloads a sheet: `/api/ekspor/penjualan?season=…`.
 *
 * A route handler rather than a page, because the answer is a file. Reading
 * is open to every active member — the same rule the pages follow — but the
 * session is checked against the database here, not only the cookie the proxy
 * looks at: a member deactivated this morning must not walk off with the
 * books on a session that still has days to run.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/ekspor/[jenis]">
) {
  const actor = await currentActor();
  if (!actor) return text("Masuk dulu untuk mengunduh data.", 401);

  const { jenis } = await ctx.params;
  if (!EXPORT_KINDS.includes(jenis as ExportKind)) {
    return text("Jenis ekspor tidak dikenal.", 404);
  }
  const kind = jenis as ExportKind;

  let season = null;
  if (isSeasonScoped(kind)) {
    const seasonId = request.nextUrl.searchParams.get(SEASON_PARAM);
    season = seasonId ? await getSeason(seasonId) : null;
    if (!season) return text("Musimnya tidak ditemukan.", 404);
  }

  const { filename, csv } = await buildExport(kind, season);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Money and names of real people; nothing between here and the browser
      // should keep a copy.
      "Cache-Control": "private, no-store",
    },
  });
}

function text(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
