/**
 * Roadmap vocabulary and input validation, shared by the browser and the
 * server. The server re-validates every request with these same schemas —
 * the client copy exists only for instant feedback.
 */

import { z } from "zod";

/* ───────────────────────────── vocabulary ───────────────────────────── */

export const LEVELS = [
  { value: "COMPLETE_BEGINNER", label: "Complete beginner", hint: "Never touched it" },
  { value: "BEGINNER", label: "Beginner", hint: "Know the basics, need guidance" },
  { value: "INTERMEDIATE", label: "Intermediate", hint: "Can build things on my own" },
  { value: "ADVANCED", label: "Advanced", hint: "Comfortable with the hard parts" },
] as const;

export type Level = (typeof LEVELS)[number]["value"];
const LEVEL_VALUES = LEVELS.map((l) => l.value) as [Level, ...Level[]];
export const levelRank = (level: Level) => LEVELS.findIndex((l) => l.value === level);
export const levelLabel = (level: Level) => LEVELS.find((l) => l.value === level)?.label ?? level;

export const STYLES = [
  { value: "PROJECTS", label: "Practical projects", hint: "Learn by building" },
  { value: "THEORY", label: "Theory and concepts", hint: "Understand why first" },
  { value: "PROBLEM_SOLVING", label: "Problem-solving", hint: "Drills and puzzles" },
  { value: "RESOURCES", label: "Video and resources", hint: "Guided material" },
  { value: "MIXED", label: "A combination", hint: "A bit of everything" },
] as const;

export type Style = (typeof STYLES)[number]["value"];
const STYLE_VALUES = STYLES.map((s) => s.value) as [Style, ...Style[]];
export const styleLabel = (style: Style) => STYLES.find((s) => s.value === style)?.label ?? style;

export const RESOURCE_TYPES = [
  "documentation",
  "article",
  "video",
  "course",
  "book",
  "tool",
  "practice",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const MAX_WEEKS = 24;
export const MAX_WEEKLY_HOURS = 60;

/* ─────────────────────────────── helpers ────────────────────────────── */

/** Removes control characters (keeping newlines and tabs) and trims. */
export function clean(value: string) {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

/** Only absolute http(s) links are ever stored or rendered. */
export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export const text = (min: number, max: number, tooShort?: string) =>
  z
    .string()
    .transform(clean)
    .pipe(
      z
        .string()
        .min(min, tooShort ?? (min === 1 ? "Required" : `At least ${min} characters`))
        .max(max, `At most ${max} characters`),
    );

const id = z.string().trim().min(1).max(64);

/* ───────────────────────────── onboarding ───────────────────────────── */

export const preferenceSchema = z
  .object({
    skill: text(2, 80, "Pick or type a skill"),
    currentLevel: z.enum(LEVEL_VALUES, "Pick where you are now"),
    targetLevel: z.enum(LEVEL_VALUES, "Pick where you want to get"),
    goal: text(10, 1000, "Tell us a little more — at least a sentence"),
    timeAmount: z.coerce.number("Enter a number").positive("Must be more than zero"),
    timeUnit: z.enum(["DAY", "WEEK"]),
    daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
    durationWeeks: z.coerce
      .number("Pick a duration")
      .int()
      .min(1, "At least one week")
      .max(MAX_WEEKS, `At most ${MAX_WEEKS} weeks`),
    learningStyle: z.enum(STYLE_VALUES, "Pick a learning style"),
    focusTopics: z.array(text(1, 80)).max(15, "Up to 15 topics").default([]),
  })
  .superRefine((value, ctx) => {
    if (value.targetLevel === "COMPLETE_BEGINNER") {
      ctx.addIssue({ code: "custom", path: ["targetLevel"], message: "Aim a little higher than where you start" });
    } else if (levelRank(value.targetLevel) < levelRank(value.currentLevel)) {
      ctx.addIssue({ code: "custom", path: ["targetLevel"], message: "Target can't be below your current level" });
    }

    if (value.timeUnit === "DAY") {
      if (value.timeAmount > 12) {
        ctx.addIssue({ code: "custom", path: ["timeAmount"], message: "At most 12 hours a day" });
      }
      if (!value.daysPerWeek) {
        ctx.addIssue({ code: "custom", path: ["daysPerWeek"], message: "How many days a week?" });
      }
    }

    const weekly = weeklyHours(value);
    if (weekly < 1) {
      ctx.addIssue({ code: "custom", path: ["timeAmount"], message: "At least an hour a week" });
    } else if (weekly > MAX_WEEKLY_HOURS) {
      ctx.addIssue({ code: "custom", path: ["timeAmount"], message: `At most ${MAX_WEEKLY_HOURS} hours a week` });
    }

    const topics = value.focusTopics.map((t) => t.toLowerCase());
    if (new Set(topics).size !== topics.length) {
      ctx.addIssue({ code: "custom", path: ["focusTopics"], message: "Each topic only once" });
    }
  });

export type PreferenceInput = z.input<typeof preferenceSchema>;
export type Preference = z.output<typeof preferenceSchema>;

export function weeklyHours(p: { timeAmount: number; timeUnit: "DAY" | "WEEK"; daysPerWeek?: number | null }) {
  const hours = p.timeUnit === "WEEK" ? p.timeAmount : p.timeAmount * (p.daysPerWeek ?? 0);
  return Math.round(hours * 10) / 10;
}

/* ───────────────────────────── roadmap edits ─────────────────────────── */

export const resourceSchema = z.object({
  title: text(2, 160),
  type: z.enum(RESOURCE_TYPES).catch("article"),
  url: z.unknown().transform(safeUrl).optional(),
  description: text(0, 400).optional(),
});
export type Resource = z.output<typeof resourceSchema>;

export const topicSchema = z.object({
  name: text(1, 120),
  subtopics: z.array(text(1, 160)).max(10).default([]),
});
export type Topic = z.output<typeof topicSchema>;

const position = z.coerce.number().int().min(1).max(100);
const reason = text(0, 500).optional();

/**
 * Everything a revision is allowed to do. Deliberately additive: nothing here
 * can delete a task or undo a completion, so accepting a revision can never
 * lose progress. Targets are checked against the live roadmap at apply time.
 */
export const revisionChangeSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add_task"),
    milestonePosition: position,
    kind: z.enum(["ASSIGNMENT", "EXERCISE"]),
    title: text(3, 160),
    description: text(1, 2000),
    reason,
  }),
  z.object({
    op: z.literal("add_resource"),
    milestonePosition: position,
    resource: resourceSchema,
    reason,
  }),
  z
    .object({
      op: z.literal("update_milestone"),
      milestonePosition: position,
      title: text(3, 160).optional(),
      summary: text(10, 2000).optional(),
      estimatedHours: z.coerce.number().min(0.5).max(200).optional(),
      addObjectives: z.array(text(3, 300)).max(6).optional(),
      addTopics: z.array(topicSchema).max(6).optional(),
      reason,
    })
    .refine(
      (c) => c.title || c.summary || c.estimatedHours || c.addObjectives?.length || c.addTopics?.length,
      "Change at least one thing",
    ),
]);
export type RevisionChange = z.output<typeof revisionChangeSchema>;

export const RECOMMENDATION_TYPES = [
  "practice",
  "prerequisite_review",
  "alternative_explanation",
  "mentor_session",
  "pacing",
] as const;

export const recommendationSchema = z.object({
  type: z.enum(RECOMMENDATION_TYPES).catch("practice"),
  title: text(3, 160),
  detail: text(1, 1500),
});
export type Recommendation = z.output<typeof recommendationSchema>;

/* ─────────────────────────────── requests ────────────────────────────── */

export const taskUpdateSchema = z
  .object({
    completed: z.boolean().optional(),
    note: z.union([text(0, 4000), z.null()]).optional(),
  })
  .refine((v) => v.completed !== undefined || v.note !== undefined, "Nothing to update");

export const attemptSchema = z.object({
  answers: z.array(z.number().int().min(0).max(9)).min(1).max(20),
  difficulties: text(0, 2000).optional(),
});

export const adaptiveSchema = z
  .object({
    milestoneId: id.optional(),
    attemptId: id.optional(),
    difficulties: text(0, 2000).default(""),
  })
  .refine((v) => v.attemptId || v.difficulties.length >= 10, {
    message: "Describe what you're finding hard (at least a sentence), or submit a quiz first",
    path: ["difficulties"],
  });

export const decisionSchema = z.object({ decision: z.enum(["accept", "reject"]) });

export const regenerateSchema = z
  .object({ deletePrevious: z.boolean().default(false), confirm: z.boolean().optional() })
  .refine((v) => !v.deletePrevious || v.confirm === true, {
    message: "Confirm that the old roadmap and its progress should be deleted",
    path: ["confirm"],
  });

export const deleteSchema = z.object({ confirm: z.literal(true, "Confirm the deletion") });

export const shareSchema = z.object({ mentorId: id });

export const proposalSchema = z.object({
  summary: text(3, 200),
  rationale: text(10, 2000),
  changes: z.array(revisionChangeSchema).min(1, "Add at least one change").max(10),
});

export const feedbackSchema = z
  .object({
    kind: z.enum(["GENERAL", "TASK", "SESSION"]),
    body: text(1, 2000),
    taskId: id.optional(),
    milestoneId: id.optional(),
    sessionTopic: text(2, 160).optional(),
  })
  .refine((v) => v.kind !== "TASK" || v.taskId, { message: "Pick the task", path: ["taskId"] })
  .refine((v) => v.kind !== "SESSION" || v.sessionTopic, {
    message: "What should the session cover?",
    path: ["sessionTopic"],
  });
