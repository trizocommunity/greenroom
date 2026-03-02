import type { ZodError } from "zod";

/**
 * Normalized API error shape for all route handlers.
 * Use this so clients can rely on a consistent structure.
 */
export type ApiErrorResponse = {
  error: string;
  code?: string;
  fields?: Record<string, string>;
};

/**
 * Map Zod validation errors to a user-facing message and optional field errors.
 */
export function formatZodError(zodError: ZodError): ApiErrorResponse {
  const issues = zodError.issues;
  const first = issues[0];
  const error = first ? first.message : "Validation failed";
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.length > 0 ? String(issue.path[0]) : "body";
    if (!(path in fields)) fields[path] = issue.message;
  }
  return { error, code: "VALIDATION", fields: Object.keys(fields).length ? fields : undefined };
}

/**
 * Format any thrown value into ApiErrorResponse.
 * Use for catch blocks in API routes.
 */
export function formatApiError(error: unknown): ApiErrorResponse {
  if (error instanceof Error && "issues" in error && Array.isArray((error as ZodError).issues)) {
    return formatZodError(error as ZodError);
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: "An unexpected error occurred" };
}
