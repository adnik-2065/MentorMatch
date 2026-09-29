/**
 * What the roadmap API returns. Dates are ISO strings. Field presence depends
 * on who's looking: learners never receive quiz answers before attempting,
 * and mentors never receive the learner's private notes or check-in text.
 */

import type { RoadmapProgress } from "./progress";
import type { Level, Recommendation, Resource, RevisionChange, Style, Topic } from "./schemas";

export type Viewer = "owner" | "mentor";
export type TaskKind = "ASSIGNMENT" | "EXERCISE" | "ASSESSMENT" | "CAPSTONE";
export type Source = "AI" | "ADAPTIVE" | "MENTOR";

export type Capstone = {
  title: string;
  description: string;
  deliverables: string[];
  skillsDemonstrated: string[];
  successCriteria: string[];
};

export type QuizQuestionView = {
  question: string;
  options: string[];
  /** Mentors only. */
  correctIndex?: number;
  explanation?: string;
};

export type TaskView = {
  id: string;
  kind: TaskKind;
  title: string;
  description: string;
  source: Source;
  completedAt: string | null;
  /** Owner only. */
  note?: string | null;
};

export type AttemptView = { id: string; score: number; maxScore: number; createdAt: string };

export type MilestoneView = {
  id: string;
  position: number;
  weekStart: number;
  weekEnd: number;
  title: string;
  summary: string;
  objectives: string[];
  topics: Topic[];
  resources: Resource[];
  estimatedHours: number;
  completionCriteria: string[];
  source: Source;
  complete: boolean;
  quiz: { questions: QuizQuestionView[] };
  tasks: TaskView[];
  attempts: AttemptView[];
};

export type RevisionView = {
  id: string;
  source: "ADAPTIVE" | "MENTOR";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  summary: string;
  rationale: string;
  evidence: "limited" | "moderate" | "strong" | null;
  recommendations: (Recommendation & { bookingHref?: string | null })[];
  changes: RevisionChange[];
  proposedBy: { id: string; name: string };
  /** Owner only — what the learner said they were finding hard. */
  learnerFeedback?: string | null;
  baseVersion: number;
  appliedVersion: number | null;
  createdAt: string;
  decidedAt: string | null;
};

export type FeedbackView = {
  id: string;
  kind: "GENERAL" | "TASK" | "SESSION";
  body: string;
  taskId: string | null;
  milestoneId: string | null;
  sessionTopic: string | null;
  mentor: { id: string; name: string };
  /** Where to book the recommended session, once booking exists server-side. */
  bookingHref: string | null;
  createdAt: string;
};

export type ShareView = {
  id: string;
  mentor: { id: string; name: string; year: string; branch: string };
  createdAt: string;
};

export type RoadmapDetail = {
  id: string;
  viewer: Viewer;
  status: "ACTIVE" | "ARCHIVED";
  title: string;
  skill: string;
  description: string;
  currentLevel: Level;
  targetLevel: Level;
  durationWeeks: number;
  hoursPerWeek: number;
  estimatedDuration: string;
  weeklyCommitment: string;
  capstone: Capstone;
  version: number;
  aiModel: string;
  goal: string;
  learningStyle: Style;
  focusTopics: string[];
  learner: { name: string; year: string; branch: string };
  startedAt: string;
  createdAt: string;
  archivedAt: string | null;
  previousRoadmapId: string | null;
  nextRoadmapId: string | null;
  progress: RoadmapProgress;
  milestones: MilestoneView[];
  revisions: RevisionView[];
  feedback: FeedbackView[];
  /** Owner only. */
  shares?: ShareView[];
};

export type RoadmapSummary = {
  id: string;
  title: string;
  skill: string;
  status: "ACTIVE" | "ARCHIVED";
  currentLevel: Level;
  targetLevel: Level;
  durationWeeks: number;
  hoursPerWeek: number;
  createdAt: string;
  archivedAt: string | null;
  progress: RoadmapProgress;
  mentors: { id: string; name: string }[];
  pendingSuggestions: number;
};

export type PendingRequest = {
  id: string;
  skill: string;
  status: "PENDING" | "GENERATING" | "FAILED";
  lastError: string | null;
  createdAt: string;
};

export type SharedRoadmapSummary = RoadmapSummary & {
  learner: { name: string; year: string; branch: string };
};

export type MentorOption = {
  id: string;
  name: string;
  year: string;
  branch: string;
  teachTopics: string[];
  teachesSkill: boolean;
};

export type AttemptResult = {
  attemptId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  passMark: number;
  results: { question: string; selectedIndex: number; correctIndex: number; correct: boolean; explanation: string }[];
};
