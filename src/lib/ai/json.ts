import type { z } from "zod";

/**
 * Turning model text into trusted data. Even in JSON mode, models wrap output
 * in code fences, add a sentence before it, or stop mid-object — so parse
 * defensively, then validate against a schema before anything is stored.
 */

export class AiOutputError extends Error {
  constructor(
    message: string,
    public issues: string[] = [],
  ) {
    super(message);
    this.name = "AiOutputError";
  }
}

export function extractJson(text: string): unknown {
  const unfenced = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try {
    return JSON.parse(unfenced);
  } catch {
    // Fall through: maybe there's prose around a single object.
  }

  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) throw new AiOutputError("Response contained no JSON object");
  try {
    return JSON.parse(unfenced.slice(start, end + 1));
  } catch {
    throw new AiOutputError("Response was not valid JSON");
  }
}

/** Parses and validates; the issues list is short enough to feed back to the model on retry. */
export function parseAiJson<S extends z.ZodType>(text: string, schema: S): z.infer<S> {
  const parsed = schema.safeParse(extractJson(text));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 12)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new AiOutputError("Response did not match the expected shape", issues);
  }
  return parsed.data;
}
