import "server-only";
import type { Prisma, TaskKind } from "@/generated/prisma/client";
import { AiOutputError, parseAiJson } from "@/lib/ai/json";
import { aiErrorCode, toUserFacingAiError } from "@/lib/ai/failures";
import { AiProviderError, getAiProvider, withRetries, type AiProvider } from "@/lib/ai/provider";
import { db, type Tx } from "@/lib/server/db";
import { conflict, notFound } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { assertAiQuota } from "@/lib/server/rate-limit";
import { aiRoadmapSchema, normalizeRoadmap, type AiRoadmap } from "./ai-output";
import { ROADMAP_SYSTEM_PROMPT, roadmapPrompt } from "./prompts";

/** A generation that started this long ago without finishing is presumed dead. */
const LOCK_MS = 5 * 60 * 1000;
const OUTPUT_ATTEMPTS = 2;
export const PASS_MARK = 0.7;

type Preference = Prisma.RoadmapPreferenceGetPayload<object>;

/**
 * Asks the model for a plan and keeps asking (once) until it validates.
 * Transient provider failures are retried inside `withRetries`; malformed
 * output is retried here, with the validator's complaints fed back.
 */
export async function draftRoadmap(provider: AiProvider, pref: Preference): Promise<AiRoadmap> {
  let issues: string[] = [];
  for (let attempt = 1; ; attempt++) {
    try {
      const text = await withRetries(() =>
        provider.generateJson({
          system: ROADMAP_SYSTEM_PROMPT,
          prompt: roadmapPrompt(pref, issues),
          temperature: 0.5,
          maxOutputTokens: 32_768,
        }),
      );
      return normalizeRoadmap(parseAiJson(text, aiRoadmapSchema), pref.durationWeeks);
    } catch (error) {
      const truncated = error instanceof AiProviderError && error.code === "truncated";
      if (!(error instanceof AiOutputError || truncated) || attempt >= OUTPUT_ATTEMPTS) throw error;
      issues = truncated
        ? ["The response was cut off at the length limit. Keep every text field shorter."]
        : error instanceof AiOutputError && error.issues.length
          ? error.issues
          : [(error as Error).message];
      log.warn("roadmap.output_retry", { preferenceId: pref.id, attempt, issues: issues.length });
    }
  }
}

/**
 * Generates and stores a roadmap for a saved preference. Pass
 * `previousRoadmapId` to regenerate: the old version is archived (history and
 * progress kept) unless the learner confirmed `deletePrevious`.
 */
export async function generateRoadmap(
  userId: string,
  preferenceId: string,
  options: { previousRoadmapId?: string; deletePrevious?: boolean; provider?: AiProvider } = {},
) {
  const pref = await db().roadmapPreference.findFirst({ where: { id: preferenceId, userId } });
  if (!pref) throw notFound("Roadmap request");

  if (options.previousRoadmapId) {
    const previous = await db().learningRoadmap.findFirst({
      where: { id: options.previousRoadmapId, ownerId: userId, preferenceId, status: "ACTIVE" },
    });
    if (!previous) throw notFound();
  }

  await assertAiQuota(userId, "ROADMAP_GENERATION");

  // Claim the preference, so a double-click can't start two paid generations.
  const claimed = await db().roadmapPreference.updateMany({
    where: {
      id: pref.id,
      userId,
      OR: [{ status: { not: "GENERATING" } }, { generationStartedAt: { lt: new Date(Date.now() - LOCK_MS) } }],
    },
    data: { status: "GENERATING", generationStartedAt: new Date(), lastError: null },
  });
  if (claimed.count === 0) throw conflict("This roadmap is already being generated. Give it a moment.");

  const savedNote = "Your answers are saved.";
  let provider: AiProvider;
  try {
    provider = options.provider ?? getAiProvider();
  } catch (error) {
    const failure = toUserFacingAiError(error, savedNote);
    await db().roadmapPreference.update({
      where: { id: pref.id },
      data: { status: "FAILED", lastError: failure.message },
    });
    throw failure;
  }

  const request = await db().aiRequest.create({
    data: { userId, kind: "ROADMAP_GENERATION", provider: provider.name, model: provider.model },
  });
  const started = Date.now();

  try {
    const plan = await draftRoadmap(provider, pref);
    const roadmap = await db().$transaction((tx) =>
      persistRoadmap(tx, { userId, pref, plan, provider, ...options }),
    );
    await db().aiRequest.update({
      where: { id: request.id },
      data: { status: "SUCCEEDED", durationMs: Date.now() - started },
    });
    log.info("roadmap.generated", { roadmapId: roadmap.id, ms: Date.now() - started });
    return roadmap;
  } catch (error) {
    const failure = toUserFacingAiError(error, savedNote);
    log.error("roadmap.generation_failed", error, { preferenceId: pref.id, code: aiErrorCode(error) });
    await db().aiRequest.update({
      where: { id: request.id },
      data: { status: "FAILED", durationMs: Date.now() - started, errorCode: aiErrorCode(error) },
    });
    await db().roadmapPreference.update({
      where: { id: pref.id },
      data: { status: "FAILED", lastError: failure.message },
    });
    throw failure;
  }
}

async function persistRoadmap(
  tx: Tx,
  {
    userId,
    pref,
    plan,
    provider,
    previousRoadmapId,
    deletePrevious,
  }: {
    userId: string;
    pref: Preference;
    plan: AiRoadmap;
    provider: AiProvider;
    previousRoadmapId?: string;
    deletePrevious?: boolean;
  },
) {
  const roadmap = await tx.learningRoadmap.create({
    data: {
      ownerId: userId,
      preferenceId: pref.id,
      title: plan.title,
      skill: pref.skill,
      description: plan.description,
      currentLevel: pref.currentLevel,
      targetLevel: pref.targetLevel,
      durationWeeks: pref.durationWeeks,
      hoursPerWeek: pref.hoursPerWeek,
      estimatedDuration: plan.estimatedDuration,
      weeklyCommitment: plan.weeklyCommitment,
      capstone: plan.capstone,
      aiProvider: provider.name,
      aiModel: provider.model,
      previousRoadmapId: deletePrevious ? null : (previousRoadmapId ?? null),
    },
  });

  const last = plan.milestones.length;
  for (const [index, m] of plan.milestones.entries()) {
    const position = index + 1;
    const milestone = await tx.roadmapMilestone.create({
      data: {
        roadmapId: roadmap.id,
        position,
        weekStart: m.weekStart,
        weekEnd: m.weekEnd,
        title: m.title,
        summary: m.summary,
        objectives: m.objectives,
        topics: m.topics,
        resources: m.resources,
        estimatedHours: m.estimatedHours,
        completionCriteria: m.completionCriteria,
        quiz: m.quiz,
      },
    });

    const tasks: { kind: TaskKind; title: string; description: string }[] = [
      ...m.assignments.map((t) => ({ kind: "ASSIGNMENT" as const, ...t })),
      ...m.exercises.map((t) => ({ kind: "EXERCISE" as const, ...t })),
      {
        kind: "ASSESSMENT",
        title: `Checkpoint quiz: ${m.title}`.slice(0, 160),
        description: `${m.quiz.questions.length} questions. Score ${Math.round(PASS_MARK * 100)}% or more to tick this off — it's a checkpoint, not a certificate.`,
      },
    ];
    if (position === last) {
      tasks.push({ kind: "CAPSTONE", title: plan.capstone.title, description: plan.capstone.description });
    }

    await tx.roadmapTask.createMany({
      data: tasks.map((t, i) => ({ ...t, roadmapId: roadmap.id, milestoneId: milestone.id, position: i + 1 })),
    });
  }

  if (previousRoadmapId) {
    // The mentor was helping with this goal, so they follow it to the new version.
    const shares = await tx.roadmapShare.findMany({
      where: { roadmapId: previousRoadmapId, status: "ACTIVE" },
    });
    if (shares.length) {
      await tx.roadmapShare.createMany({
        data: shares.map((s) => ({ roadmapId: roadmap.id, mentorId: s.mentorId })),
      });
    }

    if (deletePrevious) {
      await tx.learningRoadmap.delete({ where: { id: previousRoadmapId } });
    } else {
      await tx.learningRoadmap.update({
        where: { id: previousRoadmapId },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
    }
  }

  await tx.roadmapPreference.update({
    where: { id: pref.id },
    data: { status: "COMPLETED", lastError: null },
  });

  return roadmap;
}
