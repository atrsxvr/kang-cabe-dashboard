/**
 * Shared shape for every Server Action, and the one helper that turns a zod
 * failure into per-field messages. Previously this lived in the seasons action
 * file and the others imported it from there, which read as an accident.
 *
 * No "use server" here on purpose: this file exports types and a plain
 * function, and a "use server" module may only export async functions.
 */
export type ActionResult =
  | { ok: true; seasonId?: string; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export function fieldErrorsOf(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    // First message per field: showing the second rule a value broke is not
    // more useful than the first.
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }

  return fieldErrors;
}

export const invalidForm = (
  error: Parameters<typeof fieldErrorsOf>[0]
): ActionResult => ({
  ok: false,
  message: "Periksa kembali isian formulir.",
  fieldErrors: fieldErrorsOf(error),
});
