import "server-only";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError, badRequest } from "./errors";
import { log } from "./log";

/**
 * Wraps a route handler: rejects cross-site mutations, turns AppError and
 * validation failures into JSON responses, and hides everything else behind
 * a generic 500.
 */
export function handler<C>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (error) {
      return errorResponse(error, req);
    }
  };
}

export function errorResponse(error: unknown, req?: Request) {
  if (error instanceof AppError) {
    const headers: Record<string, string> = {};
    const retry = error.details?.retryAfterSeconds;
    if (typeof retry === "number") headers["Retry-After"] = String(retry);
    return Response.json(
      { error: { code: error.code, message: error.message, ...error.details } },
      { status: error.status, headers },
    );
  }

  log.error("api.unhandled", error, { path: req ? new URL(req.url).pathname : undefined });
  return Response.json(
    { error: { code: "internal", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}

/** Parses and validates a JSON body; field errors come back as a 400. */
export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  return validate(schema, body);
}

export function validate<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw badRequest("Some fields need another look.", {
      fields: z.flattenError(parsed.error).fieldErrors,
    });
  }
  return parsed.data;
}

/**
 * Session cookies are SameSite=Lax already; this is the second lock. A browser
 * always sends Origin on a cross-site POST, so a mismatch means a forged request.
 */
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError(403, "forbidden", "Cross-site request blocked.");
  }
  if (!host || originHost !== host) {
    throw new AppError(403, "forbidden", "Cross-site request blocked.");
  }
}
