/**
 * What we accept back from the model. Lenient where leniency is harmless
 * (over-long text is trimmed, a broken resource is dropped, "6" becomes 6)
 * and strict where it isn't (a missing week, a quiz with no valid question).
 * Anything strict that fails is fed back to the model for one more try.
 */

import { z } from "zod";
import { AiOutputError } from "@/lib/ai/json";
import {
  clean,
  recommendationSchema,
  resourceSchema,
  revisionChangeSchema,
  type RevisionChange,
} from "./schemas";

const aiText = (max: number, min = 1) =>
  z
    .string()
    .transform((s) => clean(s).slice(0, max))
    .pipe(z.string().min(min, `must be at least ${min} characters`));

const aiList = (maxItems: number, maxLength: number, min = 0) =>
  z
    .array(z.unknown())
    .transform((items) =>
      items
        .filter((item): item is string => typeof item === "string")
        .map((s) => clean(s).slice(0, maxLength))
        .filter(Boolean)
        .slice(0, maxItems),
    )
    .pipe(z.array(z.string()).min(min, `needs at least ${min} item(s)`));

/** Keeps the valid items, drops the rest; fails only if too few survive. */
function lenientArray<T extends z.ZodType>(item: T, max: number, min = 0) {
  return z.array(z.unknown()).transform((items, ctx) => {
    const kept: z.output<T>[] = [];
    for (const raw of items) {
      const parsed = item.safeParse(raw);
      if (parsed.success) kept.push(parsed.data);
    }
    if (kept.length < min) {
      ctx.addIssue({ code: "custom", message: `needs at least ${min} valid item(s), got ${kept.length}` });
      return z.NEVER;
    }
    return kept.slice(0, max);
  });
}

const aiTask = z.object({ title: aiText(160, 3), description: aiText(2000) });

const aiTopic = z.object({ name: aiText(120), subtopics: aiList(10, 160) });

const aiQuestion = z
  .object({
    question: aiText(500, 5),
    options: aiList(6, 300, 2),
    correctIndex: z.coerce.number().int(),
    explanation: aiText(800).catch(""),
  })
  .refine((q) => q.correctIndex >= 0 && q.correctIndex < q.options.length, "correctIndex out of range");

export type QuizQuestion = z.output<typeof aiQuestion>;

const aiMilestone = z
  .object({
    weekStart: z.coerce.number().int().min(1),
    weekEnd: z.coerce.number().int().min(1),
    title: aiText(160, 3),
    summary: aiText(2000, 10),
    objectives: aiList(8, 300, 1),
    topics: lenientArray(aiTopic, 10, 1),
    assignments: lenientArray(aiTask, 5),
    exercises: lenientArray(aiTask, 8),
    resources: lenientArray(resourceSchema, 8),
    estimatedHours: z.coerce.number().positive().max(300),
    completionCriteria: aiList(6, 300, 1),
    quiz: z.object({ questions: lenientArray(aiQuestion, 6, 1) }),
  })
  .refine((m) => m.assignments.length + m.exercises.length > 0, "needs at least one assignment or exercise");

export const aiRoadmapSchema = z.object({
  title: aiText(120, 3),
  description: aiText(1500, 10),
  estimatedDuration: aiText(80),
  weeklyCommitment: aiText(200),
  milestones: z.array(aiMilestone).min(1).max(12),
  capstone: z.object({
    title: aiText(160, 3),
    description: aiText(2000, 10),
    deliverables: aiList(8, 300),
    skillsDemonstrated: aiList(10, 300, 1),
    successCriteria: aiList(10, 300, 1),
  }),
});

export type AiRoadmap = z.output<typeof aiRoadmapSchema>;
export type AiMilestone = AiRoadmap["milestones"][number];
export type Capstone = AiRoadmap["capstone"];

/**
 * Makes the week ranges contiguous and inside the chosen duration. Models
 * often leave a gap, overlap two phases, or run a week past the end; none of
 * that is worth a retry, but a plan with more phases than weeks is.
 */
export function normalizeRoadmap(plan: AiRoadmap, durationWeeks: number): AiRoadmap {
  if (plan.milestones.length > durationWeeks) {
    throw new AiOutputError("More milestones than weeks", [
      `milestones: ${plan.milestones.length} milestones for a ${durationWeeks}-week plan — use at most ${durationWeeks}`,
    ]);
  }

  const sorted = [...plan.milestones].sort((a, b) => a.weekStart - b.weekStart || a.weekEnd - b.weekEnd);
  let cursor = 1;
  const milestones = sorted.map((m, i) => {
    const remaining = sorted.length - 1 - i;
    const start = cursor;
    const latestEnd = durationWeeks - remaining;
    const end = i === sorted.length - 1 ? durationWeeks : Math.min(Math.max(m.weekEnd, start), latestEnd);
    cursor = end + 1;
    return { ...m, weekStart: start, weekEnd: end, estimatedHours: Math.round(m.estimatedHours * 2) / 2 };
  });

  return { ...plan, milestones };
}

/* ─────────────────────────────── adaptive ─────────────────────────────── */

export const aiAdaptiveSchema = z.object({
  summary: aiText(200, 3),
  analysis: aiText(2500, 10),
  /** How much the evidence actually supports the conclusions — keeps the model honest. */
  evidence: z.enum(["limited", "moderate", "strong"]).catch("limited"),
  recommendations: lenientArray(recommendationSchema, 8, 1),
  changes: z.array(z.unknown()).max(20).default([]),
});

export type AiAdaptive = Omit<z.output<typeof aiAdaptiveSchema>, "changes"> & { changes: RevisionChange[] };

/**
 * Keeps only changes that parse and that target a milestone the learner
 * hasn't finished — the model doesn't get to rewrite completed work.
 */
export function filterChanges(raw: unknown[], editablePositions: Set<number>): RevisionChange[] {
  const kept: RevisionChange[] = [];
  for (const item of raw) {
    const parsed = revisionChangeSchema.safeParse(item);
    if (parsed.success && editablePositions.has(parsed.data.milestonePosition)) kept.push(parsed.data);
  }
  return kept.slice(0, 10);
}
