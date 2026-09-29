import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once on first use.
 *
 * Parsed lazily rather than at import so `next build` works without secrets;
 * the first request that needs a value fails loudly if it's missing. Nothing
 * here is NEXT_PUBLIC_, so none of it can reach the browser bundle.
 */

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(300_000).default(90_000),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;

  // Empty strings in .env files mean "unset", not "set to nothing".
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ""),
  );

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server environment — ${problems}`);
  }

  cached = parsed.data;
  return cached;
}

/** Tests change env between cases. */
export function resetEnvCache() {
  cached = null;
}
