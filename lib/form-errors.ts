import type { ZodError } from "zod";

/** First message per field; that's all a form has room to show. */
export function toFieldErrors<Field extends string>(
  error: ZodError,
): Partial<Record<Field, string>> {
  const fieldErrors: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    fieldErrors[field as Field] ??= issue.message;
  }
  return fieldErrors;
}
