import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { AiProviderError, type AiProvider } from "./provider";

/** Google Gemini via the official SDK — the provider the README plans for. */
export function createGeminiProvider({
  apiKey,
  model,
  timeoutMs,
}: {
  apiKey: string;
  model: string;
  timeoutMs: number;
}): AiProvider {
  const client = new GoogleGenAI({ apiKey });

  return {
    name: "gemini",
    model,
    async generateJson({ system, prompt, temperature = 0.4, maxOutputTokens = 16_384 }) {
      let response;
      try {
        response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            temperature,
            maxOutputTokens,
            abortSignal: AbortSignal.timeout(timeoutMs),
          },
        });
      } catch (error) {
        throw toProviderError(error, model);
      }

      const candidate = response.candidates?.[0];
      const blocked = response.promptFeedback?.blockReason;
      if (blocked || candidate?.finishReason === "SAFETY") {
        throw new AiProviderError(`Gemini blocked the request (${blocked ?? "SAFETY"})`, "blocked", false);
      }
      if (candidate?.finishReason === "MAX_TOKENS") {
        // Not retried as-is — the caller asks again with a note to be briefer.
        throw new AiProviderError("Gemini stopped at the output token limit", "truncated", false);
      }

      const text = response.text;
      if (!text?.trim()) throw new AiProviderError("Gemini returned no text", "empty", true);
      return text;
    },
  };
}

function toProviderError(error: unknown, model: string): AiProviderError {
  if (error instanceof ApiError) {
    if (error.status === 429) return new AiProviderError("Gemini rate limit", "rate_limited", true);
    if (error.status >= 500) return new AiProviderError(`Gemini ${error.status}`, "unavailable", true);
    // Gemini reports a bad key as 400 API_KEY_INVALID, not 401/403.
    if (error.status === 401 || error.status === 403 || /API_KEY_INVALID|API key not valid|API key expired/i.test(error.message)) {
      return new AiProviderError(`Gemini rejected the API key (${error.status})`, "not_configured", false);
    }
    if (error.status === 404) {
      return new AiProviderError(`Gemini model "${model}" not found — check GEMINI_MODEL`, "not_configured", false);
    }
    return new AiProviderError(`Gemini rejected the request (${error.status})`, "rejected", false);
  }
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new AiProviderError("Gemini timed out", "timeout", true);
  }
  return new AiProviderError(
    `Gemini request failed: ${error instanceof Error ? error.message : String(error)}`,
    "unavailable",
    true,
  );
}
