import { describe, expect, it } from "vitest";
import { z } from "zod";
import { emailSchema } from "@/lib/auth-shared";
import {
  feedbackSchema,
  preferenceSchema,
  regenerateSchema,
  revisionChangeSchema,
  safeUrl,
  weeklyHours,
} from "@/lib/roadmap/schemas";
import { validPreference } from "../support/helpers";

const errorsFor = (input: unknown) => {
  const result = preferenceSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
};

describe("onboarding input", () => {
  it("accepts a complete, sensible request", () => {
    const parsed = preferenceSchema.parse(validPreference);
    expect(parsed.skill).toBe("Docker");
    expect(weeklyHours(parsed)).toBe(6);
  });

  it("requires a skill, a real goal and a duration", () => {
    const errors = errorsFor({ ...validPreference, skill: " ", goal: "learn", durationWeeks: 0 });
    expect(errors.skill).toBeDefined();
    expect(errors.goal).toBeDefined();
    expect(errors.durationWeeks).toBeDefined();
  });

  it("rejects a target below the current level", () => {
    const errors = errorsFor({ ...validPreference, currentLevel: "ADVANCED", targetLevel: "BEGINNER" });
    expect(errors.targetLevel?.[0]).toMatch(/below/);
  });

  it("rejects unknown enum values", () => {
    const errors = errorsFor({ ...validPreference, learningStyle: "DREAMING", currentLevel: "GURU" });
    expect(errors.learningStyle).toBeDefined();
    expect(errors.currentLevel).toBeDefined();
  });

  it("needs days-per-week when time is given per day, and caps weekly hours", () => {
    expect(errorsFor({ ...validPreference, timeUnit: "DAY", timeAmount: 2 }).daysPerWeek).toBeDefined();
    expect(weeklyHours({ timeAmount: 2, timeUnit: "DAY", daysPerWeek: 5 })).toBe(10);
    expect(errorsFor({ ...validPreference, timeAmount: 90 }).timeAmount).toBeDefined();
    expect(errorsFor({ ...validPreference, timeAmount: 0.5 }).timeAmount).toBeDefined();
  });

  it("rejects duplicate focus topics and strips control characters", () => {
    expect(errorsFor({ ...validPreference, focusTopics: ["Volumes", "volumes"] }).focusTopics).toBeDefined();
    const parsed = preferenceSchema.parse({ ...validPreference, skill: "Dock\u0000er\u0007" });
    expect(parsed.skill).toBe("Docker");
  });

  it("caps durations at 24 weeks", () => {
    expect(errorsFor({ ...validPreference, durationWeeks: 25 }).durationWeeks).toBeDefined();
  });
});

describe("safety helpers", () => {
  it("keeps only http(s) links", () => {
    expect(safeUrl("https://docs.docker.com/")).toBe("https://docs.docker.com/");
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("data:text/html,hi")).toBeUndefined();
    expect(safeUrl("not a url")).toBeUndefined();
  });

  it("accepts college emails only", () => {
    expect(emailSchema.safeParse("Asha@IITB.ac.in").data).toBe("asha@iitb.ac.in");
    expect(emailSchema.safeParse("someone@gmail.com").success).toBe(false);
  });

  it("requires explicit confirmation before deleting the previous roadmap", () => {
    expect(regenerateSchema.safeParse({ deletePrevious: true }).success).toBe(false);
    expect(regenerateSchema.safeParse({ deletePrevious: true, confirm: true }).success).toBe(true);
    expect(regenerateSchema.parse({}).deletePrevious).toBe(false);
  });

  it("only allows additive revision operations", () => {
    expect(revisionChangeSchema.safeParse({ op: "delete_task", milestonePosition: 1 }).success).toBe(false);
    expect(revisionChangeSchema.safeParse({ op: "update_milestone", milestonePosition: 1 }).success).toBe(false);
    expect(
      revisionChangeSchema.safeParse({ op: "add_task", milestonePosition: 2, kind: "EXERCISE", title: "More drills", description: "Ten more." })
        .success,
    ).toBe(true);
  });

  it("requires a task for task feedback and a topic for session recommendations", () => {
    expect(feedbackSchema.safeParse({ kind: "TASK", body: "Nice" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ kind: "SESSION", body: "Let's meet" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ kind: "SESSION", body: "Let's meet", sessionTopic: "Volumes" }).success).toBe(true);
  });
});
