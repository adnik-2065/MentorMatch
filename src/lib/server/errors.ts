/**
 * Errors that are safe to show the user. Anything else that escapes a route
 * handler is logged and replaced with a generic 500 — internal messages,
 * prompts and stack traces never reach the client.
 */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = () =>
  new AppError(401, "unauthorized", "Sign in with your college email to continue.");

/**
 * Deliberately the same response whether the record doesn't exist or belongs
 * to someone else — a 403 would confirm that the id is real.
 */
export const notFound = (what = "Roadmap") => new AppError(404, "not_found", `${what} not found.`);

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError(400, "bad_request", message, details);

export const conflict = (message: string) => new AppError(409, "conflict", message);

export const tooManyRequests = (message: string, retryAfterSeconds: number) =>
  new AppError(429, "rate_limited", message, { retryAfterSeconds });
