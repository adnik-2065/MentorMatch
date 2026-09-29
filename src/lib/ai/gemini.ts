/**
 * Gemini client — server only.
 *
 * Imported exclusively by route handlers under `src/app/api/`. The key lives in
 * `GEMINI_API_KEY` and must never be given a `NEXT_PUBLIC_` prefix or imported
 * into a client component, or it ships inside the browser bundle.
 *
 * Nothing here throws. Every caller has a deterministic offline fallback, so a
 * missing key, a cold model or a network blip degrades the feature instead of
 * breaking the page.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Tried in order. A busy model answers 503 and a retired one 404; both fall through. */
function models(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const chain = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  return preferred ? [preferred, ...chain.filter((m) => m !== preferred)] : chain;
}

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/** A JSON Schema subset — what `responseSchema` accepts. */
export type Schema = {
  type: "object";
  properties: Record<string, { type: string; items?: { type: string }; description?: string }>;
  required: string[];
};

export async function generateJSON<T>({
  system,
  prompt,
  schema,
  temperature = 0.3,
}: {
  system: string;
  prompt: string;
  schema: Schema;
  temperature?: number;
}): Promise<{ data: T; model: string } | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature },
  });

  for (const model of models()) {
    try {
      const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body,
        // A student is staring at a spinner — give up long before they do.
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) continue;

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      return { data: JSON.parse(text) as T, model };
    } catch {
      // Timeout, network error or malformed JSON — try the next model, then give up.
    }
  }

  return null;
}

/** One turn of a conversation, in the order it happened. */
export type Turn = { role: "user" | "model"; text: string };

/**
 * Free-text, multi-turn — the chat assistant. Same key, same model chain and
 * the same "returns null rather than throwing" contract as `generateJSON`.
 */
export async function generateText({
  system,
  turns,
  temperature = 0.6,
  maxTokens = 600,
}: {
  system: string;
  turns: Turn[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; model: string } | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || turns.length === 0) return null;

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  });

  for (const model of models()) {
    try {
      const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body,
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) continue;

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      // A long answer arrives split across parts; a thinking model puts an
      // empty one first. Join them rather than reading parts[0] and losing text.
      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim();
      if (!text) continue;

      return { text, model };
    } catch {
      // Timeout or network error — try the next model, then give up.
    }
  }

  return null;
}

/** Models pad lists and occasionally repeat the input; keep them short and clean. */
export function cleanList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of value) {
    const text = typeof item === "string" ? item.trim().replace(/^[-•*]\s*/, "") : "";
    const key = text.toLowerCase();
    if (!text || text.length > 120 || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length === max) break;
  }

  return out;
}
