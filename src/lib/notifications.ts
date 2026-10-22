/**
 * What the two push notifications say, and when "besok" is.
 *
 * Pure, so the wording and the calendar arithmetic can be tested without a
 * phone, a push service or a database.
 */

export type PushMessage = {
  title: string;
  body: string;
  /** Where tapping it opens. Relative to the app. */
  url: string;
  /**
   * Notifications sharing a tag replace each other instead of piling up — a
   * phone left in a drawer for three days shows one "tugas besok", not three.
   */
  tag?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfJakartaDay(now: Date): number {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
  return Date.parse(`${key}T00:00:00+07:00`);
}

/**
 * Tomorrow on the garden's calendar, as [from, to). The same way the
 * dashboard draws "today", one day on — the scheduled run lands at 18.00–
 * 18.59 WIB, so "tomorrow" is always the next calendar day there.
 */
export function tomorrowWindow(now: Date): { from: Date; to: Date } {
  const from = startOfJakartaDay(now) + DAY_MS;
  return { from: new Date(from), to: new Date(from + DAY_MS) };
}

/** Three titles are what fits on a lock screen; the rest are counted. */
const LISTED = 3;

export function tomorrowTasksMessage(
  tasks: { title: string; season: string }[]
): PushMessage | null {
  if (tasks.length === 0) return null;

  const titles = tasks.slice(0, LISTED).map((task) => task.title).join(", ");
  const rest = tasks.length - LISTED;
  const seasons = [...new Set(tasks.map((task) => task.season))];

  return {
    title: `Besok ada ${tasks.length} tugas`,
    body:
      titles +
      (rest > 0 ? ` dan ${rest} lainnya` : "") +
      // One season is the usual case and worth naming; several would only
      // make the line longer than the lock screen shows.
      (seasons.length === 1 ? ` — ${seasons[0]}` : ""),
    url: "/tasks",
    tag: "tugas-besok",
  };
}

const SYMPTOMS_MAX = 100;

export function newFindingMessage(finding: {
  id: string;
  seasonId: string;
  reporter: string;
  symptoms: string;
  severity: string;
  location?: string | null;
}): PushMessage {
  const symptoms = finding.symptoms.trim().replace(/\s+/g, " ");
  const shown =
    symptoms.length > SYMPTOMS_MAX
      ? `${symptoms.slice(0, SYMPTOMS_MAX - 1).trimEnd()}…`
      : symptoms;

  return {
    title: `Temuan baru dari ${finding.reporter}`,
    body: [shown, finding.severity, finding.location?.trim() || null]
      .filter(Boolean)
      .join(" · "),
    url: `/health?season=${encodeURIComponent(finding.seasonId)}`,
    tag: `temuan-${finding.id}`,
  };
}

/** The evening run's hour in WIB — `vercel.json` schedules it at 11.00 UTC. */
export const EVENING_HOUR = 18;

/**
 * Whether a task just scheduled needs its own notification, and for when.
 *
 * Due today: always — no summary will mention it again. Due tomorrow: only
 * once the evening run has come round, i.e. from 18.00 WIB. Before then the
 * evening's "Besok ada N tugas" will carry it, and a second message for the
 * same task would teach people to ignore both. The run may land anywhere in
 * 18.00–18.59, so a task saved in that hour can be announced twice; that is
 * the side to err on, against one never announced at all.
 */
export function scheduledSoon(
  dueDate: Date,
  now: Date
): "today" | "tomorrow" | null {
  const today = startOfJakartaDay(now);
  const due = startOfJakartaDay(dueDate);

  if (due === today) return "today";
  if (due === today + DAY_MS) {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(now)
    );
    return hour >= EVENING_HOUR ? "tomorrow" : null;
  }
  return null;
}

export function scheduledTaskMessage(task: {
  id: string;
  title: string;
  season: string;
  when: "today" | "tomorrow";
}): PushMessage {
  return {
    title: task.when === "today" ? "Tugas baru untuk hari ini" : "Tugas baru untuk besok",
    body: `${task.title.trim()} — ${task.season}`,
    url: "/tasks",
    tag: `tugas-${task.id}`,
  };
}
