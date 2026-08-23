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

/**
 * Jakarta is a fixed UTC+7 with no daylight saving, so a calendar day's
 * midnight is always seven hours before the same date at midnight UTC.
 */
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function jakartaMidnightAsInstant(dayMarkerUtc: number): Date {
  return new Date(dayMarkerUtc - JAKARTA_OFFSET_MS);
}

/**
 * The Saturday and Sunday of the week `now` falls in, as a half-open instant
 * range [start, end) suitable for a database filter.
 *
 * Weeks run Monday–Sunday, so on a Sunday "this weekend" still means the
 * Saturday just gone plus today — not next week's.
 */
export function weekendRange(now: Date = new Date()): {
  start: Date;
  end: Date;
  saturday: Date;
  sunday: Date;
} {
  const todayMarker = startOfDayInJakarta(now);

  // Day of week read in Jakarta, remapped so Monday is 0 and Sunday is 6.
  const jakartaWeekday = new Date(todayMarker).getUTCDay();
  const mondayBased = (jakartaWeekday + 6) % 7;

  const saturdayMarker = todayMarker + (5 - mondayBased) * MS_PER_DAY;
  const sundayMarker = saturdayMarker + MS_PER_DAY;

  return {
    start: jakartaMidnightAsInstant(saturdayMarker),
    end: jakartaMidnightAsInstant(sundayMarker + MS_PER_DAY),
    saturday: jakartaMidnightAsInstant(saturdayMarker),
    sunday: jakartaMidnightAsInstant(sundayMarker),
  };
}

/**
 * Dua jendela berurutan sepanjang `days` hari, yang sekarang dan yang sebelum
 * itu, sebagai rentang setengah terbuka [start, end).
 *
 * Ada supaya keduanya dihitung dari satu tempat. Sebelumnya jendela "sekarang"
 * dibangun sebagai [hari ini − 7, besok) — yang panjangnya **delapan** hari,
 * karena hari ini ikut terhitung — sementara pembandingnya [hari ini − 14,
 * hari ini − 7) panjangnya tujuh. Tren yang membandingkan delapan hari dengan
 * tujuh naik sekitar 14% dengan sendirinya, dan kartunya memasang panah.
 */
export function trailingWindows(
  days: number,
  now: Date = new Date()
): { current: { start: Date; end: Date }; previous: { start: Date; end: Date } } {
  const todayMarker = startOfDayInJakarta(now);
  const end = todayMarker + MS_PER_DAY; // besok, supaya hari ini ikut
  const currentStart = end - days * MS_PER_DAY;
  const previousStart = currentStart - days * MS_PER_DAY;

  return {
    current: {
      start: jakartaMidnightAsInstant(currentStart),
      end: jakartaMidnightAsInstant(end),
    },
    previous: {
      start: jakartaMidnightAsInstant(previousStart),
      end: jakartaMidnightAsInstant(currentStart),
    },
  };
}

/** "9–10 Agu" — the weekend dates, for labelling the dashboard card. */
export function formatDateRange(from: Date, to: Date): string {
  const day = new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    day: "numeric",
  });
  const dayMonth = new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
  });

  const sameMonth =
    new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, month: "2-digit" })
      .format(from) ===
    new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, month: "2-digit" })
      .format(to);

  return sameMonth
    ? `${day.format(from)}–${dayMonth.format(to)}`
    : `${dayMonth.format(from)} – ${dayMonth.format(to)}`;
}
