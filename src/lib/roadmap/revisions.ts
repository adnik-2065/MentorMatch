import "server-only";
import type { z } from "zod";
import type { ContentSource, Prisma } from "@/generated/prisma/client";
import { AiOutputError, parseAiJson } from "@/lib/ai/json";
import { aiErrorCode, toUserFacingAiError } from "@/lib/ai/failures";
import { getAiProvider, withRetries, type AiProvider } from "@/lib/ai/provider";
import { db, type Tx } from "@/lib/server/db";
import { badRequest, conflict, notFound } from "@/lib/server/errors";
import { log } from "@/lib/server/log";
import { assertAiQuota } from "@/lib/server/rate-limit";
import { requireEditableOwner, requireSharedMentor } from "./access";
import { aiAdaptiveSchema, filterChanges } from "./ai-output";
import { ADAPTIVE_SYSTEM_PROMPT, adaptivePrompt } from "./prompts";
import { computeProgress, isMilestoneComplete } from "./progress";
import { levelLabel, proposalSchema, revisionChangeSchema, type Resource, type RevisionChange, type Topic } from "./schemas";

/**
 * Suggested changes to a roadmap — from the adaptive coach or a mentor.
 * Proposals are stored, shown with their reasoning, and applied only when
 * the learner accepts. Applying is additive and refuses to touch finished
 * milestones, so accepted suggestions can't erase progress, and the
 * pre-change state of every affected milestone is kept on the revision.
 */

const roadmapWithWork = {
  milestones: {
    orderBy: { position: "asc" },
    include: { tasks: { orderBy: { position: "asc" }, include: { progress: true } } },
  },
} satisfies Prisma.LearningRoadmapInclude;

type RoadmapWithWork = Prisma.LearningRoadmapGetPayload<{ include: typeof roadmapWithWork }>;

function completionView(r: RoadmapWithWork) {
  return r.milestones.map((m) => ({
    ...m,
    done: isMilestoneComplete(m.tasks.map((t) => ({ completedAt: t.progress?.completedAt ?? null }))),
  }));
}

/* ─────────────────────────────── adaptive ─────────────────────────────── */

export async function requestAdaptiveSuggestions(
  userId: string,
  roadmapId: string,
  input: { milestoneId?: string; attemptId?: string; difficulties: string },
  provider?: AiProvider,
) {
  await requireEditableOwner(userId, roadmapId);
  const roadmap = await db().learningRoadmap.findUniqueOrThrow({ where: { id: roadmapId }, include: roadmapWithWork });

  const attempt = input.attemptId
    ? await db().assessmentAttempt.findFirst({ where: { id: input.attemptId, roadmapId, userId } })
    : null;
  if (input.attemptId && !attempt) throw notFound("Quiz attempt");

  const milestones = completionView(roadmap);
  const focusId = input.milestoneId ?? attempt?.milestoneId;
  const focus = focusId ? milestones.find((m) => m.id === focusId) : milestones.find((m) => !m.done);
  if (focusId && !focus) throw notFound("Milestone");

  await assertAiQuota(userId, "ADAPTIVE");

  const savedNote = "Nothing on your roadmap has changed.";
  let ai: AiProvider;
  try {
    ai = provider ?? getAiProvider();
  } catch (error) {
    throw toUserFacingAiError(error, savedNote);
  }

  const recentAttempts = await db().assessmentAttempt.findMany({
    where: { roadmapId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { milestone: { select: { position: true } } },
  });

  const progress = computeProgress(
    milestones.map((m) => ({ ...m, tasks: m.tasks.map((t) => ({ completedAt: t.progress?.completedAt ?? null })) })),
    { startedAt: roadmap.startedAt, durationWeeks: roadmap.durationWeeks },
  );
  const editable = new Set(milestones.filter((m) => !m.done).map((m) => m.position));

  // Only what the coach needs — no names, emails, notes or mentor comments.
  const context = {
    skill: roadmap.skill,
    currentLevel: levelLabel(roadmap.currentLevel),
    targetLevel: levelLabel(roadmap.targetLevel),
    durationWeeks: roadmap.durationWeeks,
    milestones: milestones.map((m) => ({
      position: m.position,
      weeks: m.weekStart === m.weekEnd ? `${m.weekStart}` : `${m.weekStart}-${m.weekEnd}`,
      title: m.title,
      objectives: m.objectives,
      topics: (m.topics as Topic[]).map((t) => t.name),
      estimatedHours: m.estimatedHours,
      completed: m.done,
      editable: editable.has(m.position),
    })),
  };

  const missed = attempt
    ? (attempt.answers as { question: string; correct: boolean }[]).filter((a) => !a.correct).map((a) => a.question)
    : [];

  const evidence = {
    focusMilestone: focus ? { position: focus.position, title: focus.title } : null,
    quizAttempt: attempt ? { score: attempt.score, outOf: attempt.maxScore, missedQuestions: missed } : null,
    recentQuizScores: recentAttempts.map((a) => ({ milestone: a.milestone.position, score: a.score, outOf: a.maxScore })),
    incompleteTasks: milestones
      .filter((m) => m.position <= (focus?.position ?? progress.currentMilestone ?? 0))
      .flatMap((m) =>
        m.tasks
          .filter((t) => !t.progress?.completedAt)
          .map((t) => ({ milestone: m.position, kind: t.kind, title: t.title })),
      )
      .slice(0, 15),
    learnerDescription: input.difficulties || null,
    hoursPerWeek: roadmap.hoursPerWeek,
    weekReachedByWork: progress.currentWeek,
    weekByCalendar: progress.scheduledWeek,
  };

  const request = await db().aiRequest.create({
    data: { userId, kind: "ADAPTIVE", provider: ai.name, model: ai.model },
  });
  const started = Date.now();

  try {
    let output;
    for (let attemptNo = 1; ; attemptNo++) {
      const text = await withRetries(() =>
        ai.generateJson({
          system: ADAPTIVE_SYSTEM_PROMPT,
          prompt: adaptivePrompt(context, evidence),
          temperature: 0.4,
          maxOutputTokens: 8_192,
        }),
      );
      try {
        output = parseAiJson(text, aiAdaptiveSchema);
        break;
      } catch (error) {
        if (!(error instanceof AiOutputError) || attemptNo >= 2) throw error;
      }
    }

    const revision = await db().roadmapRevision.create({
      data: {
        roadmapId,
        source: "ADAPTIVE",
        proposedById: userId,
        summary: output.summary,
        rationale: output.analysis,
        evidence: output.evidence,
        recommendations: output.recommendations,
        changes: filterChanges(output.changes, editable),
        learnerFeedback: input.difficulties || null,
        assessmentAttemptId: attempt?.id ?? null,
        baseVersion: roadmap.version,
      },
    });

    await db().aiRequest.update({
      where: { id: request.id },
      data: { status: "SUCCEEDED", durationMs: Date.now() - started },
    });
    return { id: revision.id };
  } catch (error) {
    log.error("roadmap.adaptive_failed", error, { roadmapId, code: aiErrorCode(error) });
    await db().aiRequest.update({
      where: { id: request.id },
      data: { status: "FAILED", durationMs: Date.now() - started, errorCode: aiErrorCode(error) },
    });
    throw toUserFacingAiError(error, savedNote);
  }
}

/* ──────────────────────────────── mentor ──────────────────────────────── */

export async function proposeMentorRevision(
  mentorId: string,
  roadmapId: string,
  raw: z.input<typeof proposalSchema>,
) {
  // Parsed again here, not only in the route: this is where links get sanitised before storage.
  const input = proposalSchema.parse(raw);
  const shared = await requireSharedMentor(mentorId, roadmapId);
  if (shared.status === "ARCHIVED") throw conflict("This version is archived — suggest changes on the current one.");

  const roadmap = await db().learningRoadmap.findUniqueOrThrow({ where: { id: roadmapId }, include: roadmapWithWork });
  const milestones = completionView(roadmap);
  for (const change of input.changes) {
    const target = milestones.find((m) => m.position === change.milestonePosition);
    if (!target) throw badRequest(`There's no milestone ${change.milestonePosition} on this roadmap.`);
    if (target.done) throw badRequest(`Milestone ${change.milestonePosition} is already complete — suggest changes to upcoming ones.`);
  }

  const revision = await db().roadmapRevision.create({
    data: {
      roadmapId,
      source: "MENTOR",
      proposedById: mentorId,
      summary: input.summary,
      rationale: input.rationale,
      recommendations: [],
      changes: input.changes,
      baseVersion: roadmap.version,
    },
  });
  return { id: revision.id };
}

/* ─────────────────────────────── deciding ─────────────────────────────── */

export async function decideRevision(
  userId: string,
  roadmapId: string,
  revisionId: string,
  decision: "accept" | "reject",
) {
  await requireEditableOwner(userId, roadmapId);
  const revision = await db().roadmapRevision.findFirst({ where: { id: revisionId, roadmapId } });
  if (!revision) throw notFound("Suggestion");
  if (revision.status !== "PENDING") throw conflict("You've already decided on this suggestion.");

  if (decision === "reject") {
    const done = await db().roadmapRevision.updateMany({
      where: { id: revisionId, status: "PENDING" },
      data: { status: "REJECTED", decidedAt: new Date() },
    });
    if (done.count === 0) throw conflict("You've already decided on this suggestion.");
    return { status: "REJECTED" as const, version: null };
  }

  const parsed = revisionChangeSchema.array().safeParse(revision.changes);
  if (!parsed.success) throw conflict("This suggestion can't be applied any more. Reject it and ask for a new one.");

  return db().$transaction(async (tx) => {
    // Claim first, inside the transaction — a double-click can't apply twice.
    const claimed = await tx.roadmapRevision.updateMany({
      where: { id: revisionId, status: "PENDING" },
      data: { status: "ACCEPTED", decidedAt: new Date() },
    });
    if (claimed.count === 0) throw conflict("You've already decided on this suggestion.");

    const snapshot = await applyChanges(tx, roadmapId, revisionId, parsed.data, revision.source === "MENTOR" ? "MENTOR" : "ADAPTIVE");
    const roadmap = await tx.learningRoadmap.update({
      where: { id: roadmapId },
      data: { version: { increment: 1 } },
    });
    await tx.roadmapRevision.update({
      where: { id: revisionId },
      data: { appliedVersion: roadmap.version, snapshotBefore: snapshot },
    });
    return { status: "ACCEPTED" as const, version: roadmap.version };
  });
}

async function applyChanges(
  tx: Tx,
  roadmapId: string,
  revisionId: string,
  changes: RevisionChange[],
  source: ContentSource,
) {
  const milestones = await tx.roadmapMilestone.findMany({
    where: { roadmapId },
    include: { tasks: { include: { progress: true } } },
  });

  type Working = {
    id: string;
    title: string;
    summary: string;
    estimatedHours: number;
    objectives: string[];
    topics: Topic[];
    resources: Resource[];
    nextTaskPosition: number;
    touched: boolean;
  };
  const working = new Map<number, Working>();
  const snapshot: Record<string, unknown>[] = [];

  for (const m of milestones) {
    const tasks = m.tasks.map((t) => ({ completedAt: t.progress?.completedAt ?? null }));
    if (isMilestoneComplete(tasks)) continue;
    working.set(m.position, {
      id: m.id,
      title: m.title,
      summary: m.summary,
      estimatedHours: m.estimatedHours,
      objectives: [...m.objectives],
      topics: [...(m.topics as Topic[])],
      resources: [...(m.resources as Resource[])],
      nextTaskPosition: Math.max(0, ...m.tasks.map((t) => t.position)) + 1,
      touched: false,
    });
  }

  for (const change of changes) {
    const m = working.get(change.milestonePosition);
    if (!m) {
      const exists = milestones.some((x) => x.position === change.milestonePosition);
      throw conflict(
        exists
          ? `You've already finished milestone ${change.milestonePosition}, so this suggestion no longer fits. Reject it and ask for a new one.`
          : `Milestone ${change.milestonePosition} no longer exists. Reject this suggestion and ask for a new one.`,
      );
    }
    if (!m.touched) {
      const before = milestones.find((x) => x.id === m.id)!;
      snapshot.push({
        position: before.position,
        title: before.title,
        summary: before.summary,
        estimatedHours: before.estimatedHours,
        objectives: before.objectives,
        topics: before.topics,
        resources: before.resources,
        taskIds: before.tasks.map((t) => t.id),
      });
      m.touched = true;
    }

    switch (change.op) {
      case "add_task":
        await tx.roadmapTask.create({
          data: {
            roadmapId,
            milestoneId: m.id,
            position: m.nextTaskPosition++,
            kind: change.kind,
            title: change.title,
            description: change.description,
            source,
            revisionId,
          },
        });
        break;
      case "add_resource":
        m.resources.push(change.resource);
        break;
      case "update_milestone":
        if (change.title) m.title = change.title;
        if (change.summary) m.summary = change.summary;
        if (change.estimatedHours) m.estimatedHours = change.estimatedHours;
        if (change.addObjectives) m.objectives.push(...change.addObjectives);
        if (change.addTopics) m.topics.push(...change.addTopics);
        break;
    }
  }

  for (const m of working.values()) {
    if (!m.touched) continue;
    await tx.roadmapMilestone.update({
      where: { id: m.id },
      data: {
        title: m.title,
        summary: m.summary,
        estimatedHours: m.estimatedHours,
        objectives: m.objectives,
        topics: m.topics,
        resources: m.resources,
      },
    });
  }

  return snapshot as Prisma.InputJsonValue;
}
