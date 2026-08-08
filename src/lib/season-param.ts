/**
 * The selected season lives in the URL so links can be shared between members
 * and the choice survives a refresh.
 */
export const SEASON_PARAM = "season";

/** Reads the season id out of a page's resolved searchParams. */
export function readSeasonParam(
  searchParams: Record<string, string | string[] | undefined>
): string | undefined {
  const value = searchParams[SEASON_PARAM];
  return Array.isArray(value) ? value[0] : value;
}

/** Appends the current season to a link so navigation keeps its context. */
export function withSeason(href: string, seasonId?: string | null): string {
  if (!seasonId) return href;
  return `${href}?${SEASON_PARAM}=${encodeURIComponent(seasonId)}`;
}
