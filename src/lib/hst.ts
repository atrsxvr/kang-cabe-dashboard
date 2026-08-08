/**
 * HST — Hari Setelah Tanam. Day 0 is the planting date, so a season planted
 * yesterday is at HST 1.
 *
 * Counted in Asia/Jakarta, not UTC. The server runs in UTC, where "today"
 * rolls over at 07:00 WIB — a farmer opening the dashboard at 6am would see
 * yesterday's HST.
 */
const TIMEZONE = "Asia/Jakarta";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Midnight of the given instant, as seen in Jakarta, in UTC milliseconds. */
function startOfDayInJakarta(date: Date): number {
  // en-CA renders as YYYY-MM-DD, which Date.parse reads as midnight UTC.
  return Date.parse(dayFormatter.format(date));
}

const MS_PER_DAY = 86_400_000;

export function calculateHst(startDate: Date, now: Date = new Date()): number {
  const days = Math.round(
    (startOfDayInJakarta(now) - startOfDayInJakarta(startDate)) / MS_PER_DAY
  );

  // A season scheduled for next week has not started; clamp instead of
  // reporting a negative age.
  return Math.max(0, days);
}

/** Formats a date for display, in Jakarta time. */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Negative when overdue, 0 on the due date itself. */
export function daysUntil(due: Date, now: Date = new Date()): number {
  return Math.round(
    (startOfDayInJakarta(due) - startOfDayInJakarta(now)) / MS_PER_DAY
  );
}
