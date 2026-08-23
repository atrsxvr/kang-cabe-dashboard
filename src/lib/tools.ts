import { daysUntil } from "@/lib/hst";

/**
 * Tools, unlike materials, are not consumed — what they have is a condition, a
 * service history, and whoever is carrying them right now.
 */

export type ServiceStatus = "NONE" | "OK" | "DUE_SOON" | "OVERDUE";

/** A fortnight's notice, enough to fit a trip to the bengkel into a week. */
export const SERVICE_SOON_DAYS = 14;

/**
 * When the next service falls due, counted from the last one.
 *
 * A tool that has never been serviced but has an interval is treated as due
 * now: the interval says it needs looking after, and nothing on record says it
 * ever was.
 */
export function serviceStatus(
  lastServicedAt: Date | null,
  serviceIntervalDays: number | null,
  now: Date = new Date()
): ServiceStatus {
  if (!serviceIntervalDays || serviceIntervalDays <= 0) return "NONE";
  if (!lastServicedAt) return "OVERDUE";

  const due = new Date(lastServicedAt);
  due.setDate(due.getDate() + serviceIntervalDays);

  const days = daysUntil(due, now);
  if (days < 0) return "OVERDUE";
  return days <= SERVICE_SOON_DAYS ? "DUE_SOON" : "OK";
}

export function nextServiceDate(
  lastServicedAt: Date | null,
  serviceIntervalDays: number | null
): Date | null {
  if (!serviceIntervalDays || serviceIntervalDays <= 0 || !lastServicedAt) {
    return null;
  }

  const due = new Date(lastServicedAt);
  due.setDate(due.getDate() + serviceIntervalDays);
  return due;
}
