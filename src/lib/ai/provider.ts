import "server-only";
import { env } from "@/lib/server/env";
import { log } from "@/lib/server/log";
import { createGeminiProvider } from "./gemini";

/**
 * The seam between MentorMatch and whichever LLM is configured. Features ask
 * for JSON text and validate it themselves — a provider never gets trusted
 * to follow a schema. Adding a provider means one file implementing this
 * interface and one case in `getAiProvider`.
 */

export type JsonRequest = {
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateJson(request: JsonRequest): Promise<string>;
}

export type AiErrorCode =
  | "not_configured"
  | "timeout"
  | "rate_limited"
  | "unavailable"
  | "blocked"
  | "empty"
  | "truncated"
  | "rejected";

export class AiProviderError extends Error {
  constructor(
    message: string,
    public code: AiErrorCode,
    public retryable: boolean,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export function getAiProvider(): AiProvider {
  const config = env();
  switch (config.AI_PROVIDER) {
    case "gemini":
      if (!config.GEMINI_API_KEY) {
        // Name the variable and where it's read from — never its value.
        log.warn("ai.not_configured", {
          provider: "gemini",
          missing: "GEMINI_API_KEY",
          hint: "Set it in .env.local in the Next.js project root (the folder with package.json), then restart `next dev`.",
          cwd: process.cwd(),
        });
        throw new AiProviderError("GEMINI_API_KEY is not set", "not_configured", false);
      }
      return createGeminiProvider({
        apiKey: config.GEMINI_API_KEY,
        model: config.GEMINI_MODEL,
        timeoutMs: config.AI_TIMEOUT_MS,
      });
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retries transient provider failures (timeouts, 429s, 5xx) with backoff. */
export async function withRetries<T>(
  fn: () => Promise<T>,
  { retries = 2, baseDelayMs = 800 }: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const retryable = error instanceof AiProviderError && error.retryable;
      if (!retryable || attempt >= retries) throw error;
      await sleep(baseDelayMs * 2 ** attempt + Math.random() * 250);
    }
  }
}
