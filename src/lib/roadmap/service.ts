import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { TOPICS } from "@/lib/onboarding";
import { db } from "@/lib/server/db";
import { badRequest, conflict, notFound } from "@/lib/server/errors";
import type { QuizQuestion } from "./ai-output";
import { requireEditableOwner, requireOwner, requireSharedMentor, requireViewer, type RoadmapRole } from "./access";
import { sessionBookingHref } from "./booking";
import { PASS_MARK } from "./generate";
import { computeProgress, isMilestoneComplete } from "./progress";
import {
  weeklyHours,
  type Preference,
  type Recommendation,
  type Resource,
  type RevisionChange,
  type Topic,
} from "./schemas";
import type {
  AttemptResult,
  Capstone,
  FeedbackView,
  MentorOption,
  PendingRequest,
  RevisionView,
  RoadmapDetail,
  RoadmapSummary,
  SharedRoadmapSummary,
} from "./types";

/* ───────────────────────────── preferences ───────────────────────────── */

const KNOWN_SKILLS = new Set(TOPICS.map((t) => t.toLowerCase()));

export async function createPreference(userId: string, input: Preference) {
  return db().roadmapPreference.create({
    data: {
      userId,
      skill: input.skill,
      skillIsCustom: !KNOWN_SKILLS.has(input.skill.toLowerCase()),
      currentLevel: input.currentLevel,
      targetLevel: input.targetLevel,
      goal: input.goal,
      timeAmount: input.timeAmount,
      timeUnit: input.timeUnit,
      daysPerWeek: input.timeUnit === "DAY" ? (input.daysPerWeek ?? null) : null,
      hoursPerWeek: weeklyHours(input),
      durationWeeks: input.durationWeeks,
      learningStyle: input.learningStyle,
      focusTopics: input.focusTopics,
    },
    select: { id: true },
  });
}

/* ──────────────────────────────── lists ──────────────────────────────── */

const summaryInclude = {
  milestones: {
    select: {
      position: true,
      weekStart: true,
      weekEnd: true,
      tasks: { select: { progress: { select: { completedAt: true } } } },
    },
  },
  shares: { where: { status: "ACTIVE" }, select: { mentor: { select: { id: true, name: true } } } },
  _count: { select: { revisions: { where: { status: "PENDING" } } } },
} satisfies Prisma.LearningRoadmapInclude;

type SummaryRow = Prisma.LearningRoadmapGetPayload<{ include: typeof summaryInclude }>;

function toSummary(r: SummaryRow): RoadmapSummary {
  return {
    id: r.id,
    title: r.title,
    skill: r.skill,
    status: r.status,
    currentLevel: r.currentLevel,
    targetLevel: r.targetLevel,
    durationWeeks: r.durationWeeks,
    hoursPerWeek: r.hoursPerWeek,
    createdAt: r.createdAt.toISOString(),
    archivedAt: r.archivedAt?.toISOString() ?? null,
    progress: computeProgress(
      r.milestones.map((m) => ({
        ...m,
        tasks: m.tasks.map((t) => ({ completedAt: t.progress?.completedAt ?? null })),
      })),
      { startedAt: r.startedAt, durationWeeks: r.durationWeeks },
    ),
    mentors: r.shares.map((s) => s.mentor),
    pendingSuggestions: r._count.revisions,
  };
}

export async function listRoadmaps(userId: string): Promise<{
  roadmaps: RoadmapSummary[];
  pending: PendingRequest[];
}> {
  const [roadmaps, pending] = await Promise.all([
    db().learningRoadmap.findMany({
      where: { ownerId: userId },
      include: summaryInclude,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    // Requests that never produced a roadmap — failed or still running — so they can be retried.
    db().roadmapPreference.findMany({
      where: { userId, status: { not: "COMPLETED" }, roadmaps: { none: {} } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    roadmaps: roadmaps.map(toSummary),
    pending: pending.map((p) => ({
      id: p.id,
      skill: p.skill,
      status: p.status as PendingRequest["status"],
      lastError: p.lastError,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export async function listSharedRoadmaps(mentorId: string): Promise<SharedRoadmapSummary[]> {
  const rows = await db().learningRoadmap.findMany({
    where: { shares: { some: { mentorId, status: "ACTIVE" } } },
    include: { ...summaryInclude, owner: { select: { name: true, year: true, branch: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map((r) => ({ ...toSummary(r), learner: r.owner }));
}

/* ──────────────────────────────── detail ─────────────────────────────── */

const detailInclude = {
  owner: { select: { name: true, year: true, branch: true } },
  preference: { select: { goal: true, learningStyle: true, focusTopics: true } },
  milestones: {
    orderBy: { position: "asc" },
    include: {
      tasks: { orderBy: { position: "asc" }, include: { progress: true } },
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, score: true, maxScore: true, createdAt: true },
      },
    },
  },
  revisions: {
    orderBy: { createdAt: "desc" },
    include: { proposedBy: { select: { id: true, name: true } } },
  },
  shares: {
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: { mentor: { select: { id: true, name: true, year: true, branch: true } } },
  },
  feedback: { orderBy: { createdAt: "desc" }, include: { mentor: { select: { id: true, name: true } } } },
  nextRoadmaps: { select: { id: true }, orderBy: { createdAt: "desc" }, take: 1 },
} satisfies Prisma.LearningRoadmapInclude;

type DetailRow = Prisma.LearningRoadmapGetPayload<{ include: typeof detailInclude }>;

export function readQuiz(quiz: Prisma.JsonValue): QuizQuestion[] {
  const questions = (quiz as { questions?: QuizQuestion[] } | null)?.questions;
  return Array.isArray(questions) ? questions : [];
}

export async function getRoadmap(userId: string, roadmapId: string): Promise<RoadmapDetail> {
  const { role } = await requireViewer(userId, roadmapId);
  const row = await db().learningRoadmap.findUniqueOrThrow({ where: { id: roadmapId }, include: detailInclude });
  return toDetail(row, role);
}

function toDetail(r: DetailRow, viewer: RoadmapRole): RoadmapDetail {
  const owner = viewer === "owner";

  const milestones = r.milestones.map((m) => {
    const tasks = m.tasks.map((t) => ({
      id: t.id,
      kind: t.kind,
      title: t.title,
      description: t.description,
      source: t.source,
      completedAt: t.progress?.completedAt?.toISOString() ?? null,
      ...(owner && { note: t.progress?.note ?? null }),
    }));
    return {
      id: m.id,
      position: m.position,
      weekStart: m.weekStart,
      weekEnd: m.weekEnd,
      title: m.title,
      summary: m.summary,
      objectives: m.objectives,
      topics: m.topics as Topic[],
      resources: m.resources as Resource[],
      estimatedHours: m.estimatedHours,
      completionCriteria: m.completionCriteria,
      source: m.source,
      complete: isMilestoneComplete(tasks.map((t) => ({ completedAt: t.completedAt }))),
      // Learners get the questions only; answers come back after they submit.
      quiz: {
        questions: readQuiz(m.quiz).map((q) =>
          owner
            ? { question: q.question, options: q.options }
            : { question: q.question, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation },
        ),
      },
      tasks,
      attempts: m.attempts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    };
  });

  const revisions: RevisionView[] = r.revisions.map((rev) => ({
    id: rev.id,
    source: rev.source,
    status: rev.status,
    summary: rev.summary,
    rationale: rev.rationale,
    evidence: (rev.evidence as RevisionView["evidence"]) ?? null,
    recommendations: (rev.recommendations as Recommendation[]).map((rec) => ({
      ...rec,
      bookingHref: rec.type === "mentor_session" ? sessionBookingHref(null, rec.title) : undefined,
    })),
    changes: rev.changes as RevisionChange[],
    proposedBy: rev.proposedBy,
    ...(owner && { learnerFeedback: rev.learnerFeedback }),
    baseVersion: rev.baseVersion,
    appliedVersion: rev.appliedVersion,
    createdAt: rev.createdAt.toISOString(),
    decidedAt: rev.decidedAt?.toISOString() ?? null,
  }));

  const feedback: FeedbackView[] = r.feedback.map((f) => ({
    id: f.id,
    kind: f.kind,
    body: f.body,
    taskId: f.taskId,
    milestoneId: f.milestoneId,
    sessionTopic: f.sessionTopic,
    mentor: f.mentor,
    bookingHref: f.kind === "SESSION" ? sessionBookingHref(f.mentorId, f.sessionTopic ?? r.skill) : null,
    createdAt: f.createdAt.toISOString(),
  }));

  return {
    id: r.id,
    viewer,
    status: r.status,
    title: r.title,
    skill: r.skill,
    description: r.description,
    currentLevel: r.currentLevel,
    targetLevel: r.targetLevel,
    durationWeeks: r.durationWeeks,
    hoursPerWeek: r.hoursPerWeek,
    estimatedDuration: r.estimatedDuration,
    weeklyCommitment: r.weeklyCommitment,
    capstone: r.capstone as Capstone,
    version: r.version,
    aiModel: r.aiModel,
    goal: r.preference.goal,
    learningStyle: r.preference.learningStyle,
    focusTopics: r.preference.focusTopics,
    learner: r.owner,
    startedAt: r.startedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    archivedAt: r.archivedAt?.toISOString() ?? null,
    previousRoadmapId: r.previousRoadmapId,
    nextRoadmapId: r.nextRoadmaps[0]?.id ?? null,
    progress: computeProgress(milestones, { startedAt: r.startedAt, durationWeeks: r.durationWeeks }),
    milestones,
    revisions,
    feedback,
    ...(owner && {
      shares: r.shares.map((s) => ({ id: s.id, mentor: s.mentor, createdAt: s.createdAt.toISOString() })),
    }),
  };
}

export async function deleteRoadmap(userId: string, roadmapId: string) {
  await requireOwner(userId, roadmapId);
  await db().learningRoadmap.delete({ where: { id: roadmapId } });
}

/* ──────────────────────────── task progress ──────────────────────────── */

export async function updateTask(
  userId: string,
  roadmapId: string,
  taskId: string,
  input: { completed?: boolean; note?: string | null },
) {
  await requireEditableOwner(userId, roadmapId);
  const task = await db().roadmapTask.findFirst({ where: { id: taskId, roadmapId }, include: { progress: true } });
  if (!task) throw notFound("Task");
  if (input.completed !== undefined && task.kind === "ASSESSMENT") {
    throw badRequest("Checkpoint quizzes tick themselves off when you pass the quiz.");
  }

  const data: { completedAt?: Date | null; note?: string | null } = {};
  // Re-ticking keeps the original completion time.
  if (input.completed !== undefined) data.completedAt = input.completed ? (task.progress?.completedAt ?? new Date()) : null;
  if (input.note !== undefined) data.note = input.note || null;

  const progress = await db().taskProgress.upsert({
    where: { taskId },
    create: { taskId, roadmapId, userId, ...data },
    update: data,
  });
  return { taskId, completedAt: progress.completedAt?.toISOString() ?? null, note: progress.note };
}

export async function submitAttempt(
  userId: string,
  roadmapId: string,
  milestoneId: string,
  input: { answers: number[]; difficulties?: string },
): Promise<AttemptResult> {
  await requireEditableOwner(userId, roadmapId);
  const milestone = await db().roadmapMilestone.findFirst({
    where: { id: milestoneId, roadmapId },
    include: { tasks: { where: { kind: "ASSESSMENT" }, include: { progress: true } } },
  });
  if (!milestone) throw notFound("Milestone");

  const questions = readQuiz(milestone.quiz);
  if (questions.length === 0) throw conflict("This milestone has no quiz.");
  if (input.answers.length !== questions.length) throw badRequest("Answer every question before submitting.");
  if (input.answers.some((a, i) => a >= questions[i].options.length)) throw badRequest("One of the answers isn't an option.");

  const results = questions.map((q, i) => ({
    question: q.question,
    selectedIndex: input.answers[i],
    correctIndex: q.correctIndex,
    correct: input.answers[i] === q.correctIndex,
    explanation: q.explanation,
  }));
  const score = results.filter((r) => r.correct).length;
  const passed = score / questions.length >= PASS_MARK;

  const attempt = await db().$transaction(async (tx) => {
    const created = await tx.assessmentAttempt.create({
      data: {
        roadmapId,
        milestoneId,
        userId,
        score,
        maxScore: questions.length,
        answers: results.map(({ explanation: _explanation, ...r }) => r),
        difficulties: input.difficulties || null,
      },
    });
    // Passing ticks the checkpoint; failing never un-ticks an earlier pass.
    if (passed) {
      for (const task of milestone.tasks) {
        await tx.taskProgress.upsert({
          where: { taskId: task.id },
          create: { taskId: task.id, roadmapId, userId, completedAt: new Date() },
          update: { completedAt: task.progress?.completedAt ?? new Date() },
        });
      }
    }
    return created;
  });

  return { attemptId: attempt.id, score, maxScore: questions.length, passed, passMark: PASS_MARK, results };
}

/* ─────────────────────────────── sharing ─────────────────────────────── */

export async function listMentors(userId: string, skill: string): Promise<MentorOption[]> {
  const mentors = await db().user.findMany({
    where: { isMentor: true, id: { not: userId } },
    select: { id: true, name: true, year: true, branch: true, teachTopics: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  const wanted = skill.trim().toLowerCase();
  return mentors
    .map((m) => ({
      ...m,
      name: m.name || "Unnamed mentor",
      teachesSkill: Boolean(wanted) && m.teachTopics.some((t) => t.toLowerCase() === wanted),
    }))
    .sort((a, b) => Number(b.teachesSkill) - Number(a.teachesSkill));
}

export async function shareRoadmap(userId: string, roadmapId: string, mentorId: string) {
  await requireEditableOwner(userId, roadmapId);
  if (mentorId === userId) throw badRequest("You can't share a roadmap with yourself.");
  const mentor = await db().user.findFirst({ where: { id: mentorId, isMentor: true }, select: { id: true } });
  if (!mentor) throw notFound("Mentor");

  const share = await db().roadmapShare.upsert({
    where: { roadmapId_mentorId: { roadmapId, mentorId } },
    create: { roadmapId, mentorId },
    update: { status: "ACTIVE", revokedAt: null },
  });
  return { id: share.id };
}

export async function revokeShare(userId: string, roadmapId: string, shareId: string) {
  await requireOwner(userId, roadmapId);
  const revoked = await db().roadmapShare.updateMany({
    where: { id: shareId, roadmapId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  if (revoked.count === 0) throw notFound("Share");
}

/* ──────────────────────────── mentor feedback ────────────────────────── */

export async function addFeedback(
  mentorId: string,
  roadmapId: string,
  input: { kind: "GENERAL" | "TASK" | "SESSION"; body: string; taskId?: string; milestoneId?: string; sessionTopic?: string },
) {
  await requireSharedMentor(mentorId, roadmapId);

  // Both ids must belong to this roadmap — a share on one roadmap grants nothing on another.
  let milestoneId = input.milestoneId ?? null;
  if (input.taskId) {
    const task = await db().roadmapTask.findFirst({ where: { id: input.taskId, roadmapId } });
    if (!task) throw notFound("Task");
    milestoneId = task.milestoneId;
  } else if (milestoneId) {
    const milestone = await db().roadmapMilestone.findFirst({ where: { id: milestoneId, roadmapId } });
    if (!milestone) throw notFound("Milestone");
  }

  const feedback = await db().mentorFeedback.create({
    data: {
      roadmapId,
      mentorId,
      kind: input.kind,
      body: input.body,
      taskId: input.kind === "TASK" ? (input.taskId ?? null) : null,
      milestoneId,
      sessionTopic: input.kind === "SESSION" ? (input.sessionTopic ?? null) : null,
    },
  });
  return { id: feedback.id };
}
