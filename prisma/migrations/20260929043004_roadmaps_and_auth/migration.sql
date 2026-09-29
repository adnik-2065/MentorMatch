-- CreateEnum
CREATE TYPE "ProficiencyLevel" AS ENUM ('COMPLETE_BEGINNER', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "LearningStyle" AS ENUM ('PROJECTS', 'THEORY', 'PROBLEM_SOLVING', 'RESOURCES', 'MIXED');

-- CreateEnum
CREATE TYPE "TimeUnit" AS ENUM ('DAY', 'WEEK');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RoadmapStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('AI', 'ADAPTIVE', 'MENTOR');

-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('ASSIGNMENT', 'EXERCISE', 'ASSESSMENT', 'CAPSTONE');

-- CreateEnum
CREATE TYPE "RevisionSource" AS ENUM ('ADAPTIVE', 'MENTOR');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('GENERAL', 'TASK', 'SESSION');

-- CreateEnum
CREATE TYPE "AiRequestKind" AS ENUM ('ROADMAP_GENERATION', 'ADAPTIVE');

-- CreateEnum
CREATE TYPE "AiRequestStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "college" TEXT NOT NULL DEFAULT '',
    "year" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT '',
    "isMentor" BOOLEAN NOT NULL DEFAULT false,
    "teachTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "learnTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "skillIsCustom" BOOLEAN NOT NULL DEFAULT false,
    "currentLevel" "ProficiencyLevel" NOT NULL,
    "targetLevel" "ProficiencyLevel" NOT NULL,
    "goal" TEXT NOT NULL,
    "timeAmount" DOUBLE PRECISION NOT NULL,
    "timeUnit" "TimeUnit" NOT NULL,
    "daysPerWeek" INTEGER,
    "hoursPerWeek" DOUBLE PRECISION NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "learningStyle" "LearningStyle" NOT NULL,
    "focusTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "generationStartedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRoadmap" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "preferenceId" TEXT NOT NULL,
    "status" "RoadmapStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currentLevel" "ProficiencyLevel" NOT NULL,
    "targetLevel" "ProficiencyLevel" NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "hoursPerWeek" DOUBLE PRECISION NOT NULL,
    "estimatedDuration" TEXT NOT NULL,
    "weeklyCommitment" TEXT NOT NULL,
    "capstone" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "aiProvider" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "previousRoadmapId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningRoadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapMilestone" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "weekStart" INTEGER NOT NULL,
    "weekEnd" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "objectives" TEXT[],
    "topics" JSONB NOT NULL,
    "resources" JSONB NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "completionCriteria" TEXT[],
    "quiz" JSONB NOT NULL,
    "source" "ContentSource" NOT NULL DEFAULT 'AI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapTask" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "TaskKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" "ContentSource" NOT NULL DEFAULT 'AI',
    "revisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskProgress" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "difficulties" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapRevision" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "source" "RevisionSource" NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'PENDING',
    "proposedById" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "recommendations" JSONB NOT NULL,
    "changes" JSONB NOT NULL,
    "learnerFeedback" TEXT,
    "assessmentAttemptId" TEXT,
    "baseVersion" INTEGER NOT NULL,
    "appliedVersion" INTEGER,
    "snapshotBefore" JSONB,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapShare" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "status" "ShareStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RoadmapShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorFeedback" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "kind" "FeedbackKind" NOT NULL,
    "body" TEXT NOT NULL,
    "taskId" TEXT,
    "milestoneId" TEXT,
    "sessionTopic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AiRequestKind" NOT NULL,
    "status" "AiRequestStatus" NOT NULL DEFAULT 'STARTED',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "durationMs" INTEGER,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OtpChallenge_email_createdAt_idx" ON "OtpChallenge"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "RoadmapPreference_userId_createdAt_idx" ON "RoadmapPreference"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningRoadmap_ownerId_status_createdAt_idx" ON "LearningRoadmap"("ownerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapMilestone_roadmapId_position_key" ON "RoadmapMilestone"("roadmapId", "position");

-- CreateIndex
CREATE INDEX "RoadmapTask_roadmapId_idx" ON "RoadmapTask"("roadmapId");

-- CreateIndex
CREATE INDEX "RoadmapTask_milestoneId_position_idx" ON "RoadmapTask"("milestoneId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TaskProgress_taskId_key" ON "TaskProgress"("taskId");

-- CreateIndex
CREATE INDEX "TaskProgress_roadmapId_idx" ON "TaskProgress"("roadmapId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_roadmapId_milestoneId_createdAt_idx" ON "AssessmentAttempt"("roadmapId", "milestoneId", "createdAt");

-- CreateIndex
CREATE INDEX "RoadmapRevision_roadmapId_status_createdAt_idx" ON "RoadmapRevision"("roadmapId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RoadmapShare_mentorId_status_idx" ON "RoadmapShare"("mentorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapShare_roadmapId_mentorId_key" ON "RoadmapShare"("roadmapId", "mentorId");

-- CreateIndex
CREATE INDEX "MentorFeedback_roadmapId_createdAt_idx" ON "MentorFeedback"("roadmapId", "createdAt");

-- CreateIndex
CREATE INDEX "AiRequest_userId_kind_createdAt_idx" ON "AiRequest"("userId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapPreference" ADD CONSTRAINT "RoadmapPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRoadmap" ADD CONSTRAINT "LearningRoadmap_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRoadmap" ADD CONSTRAINT "LearningRoadmap_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "RoadmapPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRoadmap" ADD CONSTRAINT "LearningRoadmap_previousRoadmapId_fkey" FOREIGN KEY ("previousRoadmapId") REFERENCES "LearningRoadmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapMilestone" ADD CONSTRAINT "RoadmapMilestone_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "LearningRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapTask" ADD CONSTRAINT "RoadmapTask_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "LearningRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapTask" ADD CONSTRAINT "RoadmapTask_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "RoadmapMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapTask" ADD CONSTRAINT "RoadmapTask_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "RoadmapRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProgress" ADD CONSTRAINT "TaskProgress_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "RoadmapTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProgress" ADD CONSTRAINT "TaskProgress_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "LearningRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProgress" ADD CONSTRAINT "TaskProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "LearningRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "RoadmapMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapRevision" ADD CONSTRAINT "RoadmapRevision_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "LearningRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapRevision" ADD CONSTRAINT "RoadmapRevision_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapRevision" ADD CONSTRAINT "RoadmapRevision_assessmentAttemptId_fkey" FOREIGN KEY ("assessmentAttemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapShare" ADD CONSTRAINT "RoadmapShare_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "LearningRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapShare" ADD CONSTRAINT "RoadmapShare_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorFeedback" ADD CONSTRAINT "MentorFeedback_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "LearningRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorFeedback" ADD CONSTRAINT "MentorFeedback_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorFeedback" ADD CONSTRAINT "MentorFeedback_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "RoadmapTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorFeedback" ADD CONSTRAINT "MentorFeedback_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "RoadmapMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRequest" ADD CONSTRAINT "AiRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
