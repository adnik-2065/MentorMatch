import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stand-in for the SDK: each test decides what generateContent does.
const generateContent = vi.hoisted(() => vi.fn());
vi.mock("@google/genai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  return {
    ...actual,
    GoogleGenAI: class {
      models = { generateContent };
    },
  };
});

import { ApiError } from "@google/genai";
import { toUserFacingAiError } from "@/lib/ai/failures";
import { createGeminiProvider } from "@/lib/ai/gemini";
import { AiProviderError, getAiProvider } from "@/lib/ai/provider";
import { env, resetEnvCache } from "@/lib/server/env";

const FAKE_KEY = "test-key-not-real-0000000000000000000";
const provider = () => createGeminiProvider({ apiKey: FAKE_KEY, model: "gemini-test", timeoutMs: 5_000 });
const request = { system: "s", prompt: "p" };

async function failure(apiError: ApiError) {
  generateContent.mockRejectedValueOnce(apiError);
  const error = await provider().generateJson(request).catch((e) => e);
  expect(error).toBeInstanceOf(AiProviderError);
  return error as AiProviderError;
}

describe("Gemini configuration", () => {
  const saved = { ...process.env };
  beforeEach(resetEnvCache);
  afterEach(() => {
    process.env = { ...saved };
    resetEnvCache();
  });

  it("treats an empty GEMINI_API_KEY as missing and reports not configured", () => {
    process.env.GEMINI_API_KEY = "";
    expect(env().GEMINI_API_KEY).toBeUndefined();
    const error = (() => {
      try {
        getAiProvider();
      } catch (e) {
        return e;
      }
    })();
    expect(error).toMatchObject({ code: "not_configured", retryable: false });
    expect(toUserFacingAiError(error, "").code).toBe("ai_not_configured");
  });

  it("builds a provider from a server-side key and the configured model", () => {
    process.env.GEMINI_API_KEY = FAKE_KEY;
    process.env.GEMINI_MODEL = "gemini-3.5-flash";
    expect(getAiProvider()).toMatchObject({ name: "gemini", model: "gemini-3.5-flash" });
  });

  it("defaults to a model that is still available to new API keys", () => {
    process.env.GEMINI_API_KEY = FAKE_KEY;
    delete process.env.GEMINI_MODEL;
    // gemini-2.5-flash now returns 404 "no longer available to new users".
    expect(getAiProvider().model).toBe("gemini-3.5-flash");
  });
});

describe("Gemini error mapping", () => {
  beforeEach(() => generateContent.mockReset());

  it("maps an invalid key (Gemini sends 400 API_KEY_INVALID) to not configured, without leaking the key", async () => {
    const error = await failure(
      new ApiError({ status: 400, message: '{"error":{"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}' }),
    );
    expect(error).toMatchObject({ code: "not_configured", retryable: false });
    expect(error.message).not.toContain(FAKE_KEY);
    expect(toUserFacingAiError(error, "").code).toBe("ai_not_configured");
  });

  it("maps an unknown or retired model (404) to not configured and names the model", async () => {
    const error = await failure(new ApiError({ status: 404, message: "models/gemini-test is not found" }));
    expect(error).toMatchObject({ code: "not_configured", retryable: false });
    expect(error.message).toContain('"gemini-test"');
  });

  it("treats overload (503) and rate limits (429) as retryable", async () => {
    expect(await failure(new ApiError({ status: 503, message: "UNAVAILABLE high demand" }))).toMatchObject({
      code: "unavailable",
      retryable: true,
    });
    expect(await failure(new ApiError({ status: 429, message: "RESOURCE_EXHAUSTED" }))).toMatchObject({
      code: "rate_limited",
      retryable: true,
    });
  });

  it("keeps other 400s as a non-retryable rejection", async () => {
    const error = await failure(new ApiError({ status: 400, message: "Invalid JSON payload" }));
    expect(error).toMatchObject({ code: "rejected", retryable: false });
  });

  it("sends the key only to the SDK, and requests JSON output", async () => {
    generateContent.mockResolvedValueOnce({ text: '{"ok":true}', candidates: [{ finishReason: "STOP" }] });
    await expect(provider().generateJson(request)).resolves.toBe('{"ok":true}');
    const call = generateContent.mock.calls[0][0];
    expect(call.model).toBe("gemini-test");
    expect(call.config.responseMimeType).toBe("application/json");
    expect(JSON.stringify(call)).not.toContain(FAKE_KEY);
  });
});
