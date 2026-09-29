import { describe, expect, it, vi } from "vitest";
import { toUserFacingAiError } from "@/lib/ai/failures";
import { AiOutputError } from "@/lib/ai/json";
import { AiProviderError, withRetries } from "@/lib/ai/provider";
import { computeProgress } from "@/lib/roadmap/progress";

const done = { completedAt: "2026-09-01T00:00:00.000Z" };
const open = { completedAt: null };

describe("progress", () => {
  const startedAt = new Date("2026-09-01T00:00:00Z");

  it("derives every number from task completions", () => {
    const p = computeProgress(
      [
        { position: 1, weekStart: 1, weekEnd: 1, tasks: [done, done] },
        { position: 2, weekStart: 2, weekEnd: 3, tasks: [done, open, open] },
        { position: 3, weekStart: 4, weekEnd: 4, tasks: [open] },
      ],
      { startedAt, durationWeeks: 4, now: new Date("2026-09-16T00:00:00Z") },
    );
    expect(p).toMatchObject({
      totalTasks: 6,
      completedTasks: 3,
      percent: 50,
      totalMilestones: 3,
      completedMilestones: 1,
      currentMilestone: 2,
      currentWeek: 2,
      scheduledWeek: 3,
      complete: false,
    });
  });

  it("handles empty and finished roadmaps", () => {
    expect(computeProgress([], { startedAt, durationWeeks: 4 }).percent).toBe(0);
    const finished = computeProgress([{ position: 1, weekStart: 1, weekEnd: 1, tasks: [done] }], {
      startedAt,
      durationWeeks: 1,
      now: new Date("2027-01-01T00:00:00Z"),
    });
    expect(finished).toMatchObject({ percent: 100, complete: true, currentMilestone: null, scheduledWeek: 1 });
  });

  it("never counts a milestone with no tasks as complete", () => {
    const p = computeProgress([{ position: 1, weekStart: 1, weekEnd: 1, tasks: [] }], { startedAt, durationWeeks: 1 });
    expect(p.completedMilestones).toBe(0);
    expect(p.complete).toBe(false);
  });
});

describe("provider retries", () => {
  it("retries transient failures, then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AiProviderError("busy", "rate_limited", true))
      .mockResolvedValueOnce("ok");
    await expect(withRetries(fn, { baseDelayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent failures", async () => {
    const fn = vi.fn().mockRejectedValue(new AiProviderError("bad key", "not_configured", false));
    await expect(withRetries(fn, { baseDelayMs: 1 })).rejects.toThrow("bad key");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget", async () => {
    const fn = vi.fn().mockRejectedValue(new AiProviderError("down", "unavailable", true));
    await expect(withRetries(fn, { retries: 2, baseDelayMs: 1 })).rejects.toThrow("down");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("user-facing AI errors", () => {
  it("maps failures to actionable messages without leaking internals", () => {
    const cases: [unknown, number, string][] = [
      [new AiProviderError("GEMINI_API_KEY is not set", "not_configured", false), 503, "ai_not_configured"],
      [new AiProviderError("Gemini timed out", "timeout", true), 504, "ai_timeout"],
      [new AiProviderError("429", "rate_limited", true), 503, "ai_unavailable"],
      [new AiProviderError("SAFETY", "blocked", false), 422, "ai_blocked"],
      [new AiOutputError("bad json", ["milestones: required"]), 502, "ai_invalid_output"],
      [new Error("connection refused at 10.0.0.3"), 500, "internal"],
    ];
    for (const [error, status, code] of cases) {
      const mapped = toUserFacingAiError(error, "Your answers are saved.");
      expect(mapped.status).toBe(status);
      expect(mapped.code).toBe(code);
      expect(mapped.message).not.toMatch(/GEMINI|10\.0\.0\.3|milestones: required/);
    }
  });
});
