/**
 * Shared by playwright.config.ts, notifications.spec.ts and the teardown.
 */

/** The e2e server's stand-in for Vercel Cron's secret. Used nowhere else. */
export const E2E_CRON_SECRET = "e2e-cron-hanya-untuk-pengujian";

/**
 * Where the stubbed browser "subscribes": a port nothing listens on, so a push
 * sent there is refused at once and reaches no phone — and the teardown finds
 * these rows by it, since they hang off a real member.
 *
 * Not a `.invalid` name, the first choice: a resolver may forward those
 * upstream rather than refuse them, and one took twelve seconds to say no —
 * longer than the test waits for the answer.
 */
export const FAKE_PUSH_ORIGIN = "https://127.0.0.1:9/";
