export const FINDING_STATUS_PARAM = "status";

export const FINDING_STATUS_ORDER = [
  "REPORTED",
  "DIAGNOSED",
  "TREATED",
  "RESOLVED",
] as const;

export type FindingStatusValue = (typeof FINDING_STATUS_ORDER)[number];

/**
 * Plain module, no `server-only`: the page reads the param on the server and
 * the select writes it on the client, and both need the same definition of
 * what a valid value is.
 */
export function readStatusParam(
  searchParams: Record<string, string | string[] | undefined>
): FindingStatusValue | undefined {
  const raw = searchParams[FINDING_STATUS_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;

  return FINDING_STATUS_ORDER.includes(value as FindingStatusValue)
    ? (value as FindingStatusValue)
    : undefined;
}
