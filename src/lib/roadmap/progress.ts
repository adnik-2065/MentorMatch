/**
 * Progress is always computed from stored task completions — there is no
 * progress column to drift out of sync. Pure, so the server and the tests
 * share one definition.
 */

export type ProgressMilestone = {
  position: number;
  weekStart: number;
  weekEnd: number;
  tasks: { completedAt: Date | string | null }[];
};

export type RoadmapProgress = {
  totalTasks: number;
  completedTasks: number;
  totalMilestones: number;
  completedMilestones: number;
  percent: number;
  /** First milestone that still has open tasks; null once everything is done. */
  currentMilestone: number | null;
  /** The week the learner has actually reached, by completed work. */
  currentWeek: number | null;
  /** The week the calendar says they'd be on if they kept to schedule. */
  scheduledWeek: number;
  complete: boolean;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function isMilestoneComplete(tasks: ProgressMilestone["tasks"]) {
  return tasks.length > 0 && tasks.every((t) => t.completedAt);
}

export function computeProgress(
  milestones: ProgressMilestone[],
  { startedAt, durationWeeks, now = new Date() }: { startedAt: Date | string; durationWeeks: number; now?: Date },
): RoadmapProgress {
  const ordered = [...milestones].sort((a, b) => a.position - b.position);
  const tasks = ordered.flatMap((m) => m.tasks);
  const completedTasks = tasks.filter((t) => t.completedAt).length;
  const completedMilestones = ordered.filter((m) => isMilestoneComplete(m.tasks)).length;
  const current = ordered.find((m) => !isMilestoneComplete(m.tasks)) ?? null;

  const elapsed = now.getTime() - new Date(startedAt).getTime();
  const scheduledWeek = Math.min(Math.max(Math.floor(elapsed / WEEK_MS) + 1, 1), Math.max(durationWeeks, 1));

  return {
    totalTasks: tasks.length,
    completedTasks,
    totalMilestones: ordered.length,
    completedMilestones,
    percent: tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100),
    currentMilestone: current?.position ?? null,
    currentWeek: current?.weekStart ?? null,
    scheduledWeek,
    complete: ordered.length > 0 && current === null,
  };
}
