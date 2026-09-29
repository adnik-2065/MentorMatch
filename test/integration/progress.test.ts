import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { getRoadmap, listRoadmaps, submitAttempt, updateTask } from "@/lib/roadmap/service";
import { createRoadmapFor, hasDb, makeUser, resetDb } from "../support/helpers";

describe.runIf(hasDb)("task completion and progress", () => {
  beforeEach(resetDb);

  it("persists completions and notes, and progress is derived from them", async () => {
    const user = await makeUser();
    const { roadmap } = await createRoadmapFor(user.id);
    const [assignment, exercise] = (await getRoadmap(user.id, roadmap.id)).milestones[0].tasks;

    await updateTask(user.id, roadmap.id, assignment.id, { completed: true });
    await updateTask(user.id, roadmap.id, exercise.id, { note: "Stuck on bind mounts" });

    // A fresh read — as after logout, refresh or another device — sees the same state.
    const reloaded = await getRoadmap(user.id, roadmap.id);
    const tasks = reloaded.milestones[0].tasks;
    expect(tasks[0].completedAt).not.toBeNull();
    expect(tasks[1].completedAt).toBeNull();
    expect(tasks[1].note).toBe("Stuck on bind mounts");
    expect(reloaded.progress).toMatchObject({ completedTasks: 1, totalTasks: 10, percent: 10 });

    const [summary] = (await listRoadmaps(user.id)).roadmaps;
    expect(summary.progress.completedTasks).toBe(1);
  });

  it("never creates duplicate completion records and keeps the first completion time", async () => {
    const user = await makeUser();
    const { roadmap } = await createRoadmapFor(user.id);
    const task = (await getRoadmap(user.id, roadmap.id)).milestones[0].tasks[0];

    const first = await updateTask(user.id, roadmap.id, task.id, { completed: true });
    await Promise.all([
      updateTask(user.id, roadmap.id, task.id, { completed: true }),
      updateTask(user.id, roadmap.id, task.id, { completed: true }),
    ]);
    const again = await updateTask(user.id, roadmap.id, task.id, { completed: true });

    expect(await db().taskProgress.count({ where: { taskId: task.id } })).toBe(1);
    expect(again.completedAt).toBe(first.completedAt);

    await updateTask(user.id, roadmap.id, task.id, { completed: false });
    expect((await getRoadmap(user.id, roadmap.id)).progress.completedTasks).toBe(0);
  });

  it("rejects tasks that belong to a different roadmap", async () => {
    const user = await makeUser();
    const { roadmap: a } = await createRoadmapFor(user.id);
    const { roadmap: b } = await createRoadmapFor(user.id);
    const taskFromB = (await getRoadmap(user.id, b.id)).milestones[0].tasks[0];
    await expect(updateTask(user.id, a.id, taskFromB.id, { completed: true })).rejects.toMatchObject({ status: 404 });
  });

  it("grades quizzes on the server; passing ticks the checkpoint, failing doesn't", async () => {
    const user = await makeUser();
    const { roadmap } = await createRoadmapFor(user.id);
    const milestone = (await getRoadmap(user.id, roadmap.id)).milestones[0];
    const assessment = milestone.tasks.find((t) => t.kind === "ASSESSMENT")!;

    // Checkpoints can't be ticked by hand.
    await expect(updateTask(user.id, roadmap.id, assessment.id, { completed: true })).rejects.toMatchObject({
      status: 400,
    });

    const fail = await submitAttempt(user.id, roadmap.id, milestone.id, {
      answers: [0, 0, 0],
      difficulties: "Volumes confuse me",
    });
    expect(fail).toMatchObject({ score: 1, maxScore: 3, passed: false });
    expect(fail.results[1]).toMatchObject({ correct: false, correctIndex: 1 });
    expect((await getRoadmap(user.id, roadmap.id)).milestones[0].tasks.find((t) => t.kind === "ASSESSMENT")!.completedAt).toBeNull();

    const pass = await submitAttempt(user.id, roadmap.id, milestone.id, { answers: [0, 1, 1] });
    expect(pass).toMatchObject({ score: 3, passed: true });

    const after = await getRoadmap(user.id, roadmap.id);
    expect(after.milestones[0].tasks.find((t) => t.kind === "ASSESSMENT")!.completedAt).not.toBeNull();
    expect(after.milestones[0].attempts).toHaveLength(2);

    // A later failed retake doesn't un-tick an earlier pass.
    await submitAttempt(user.id, roadmap.id, milestone.id, { answers: [3, 3, 3] });
    expect((await getRoadmap(user.id, roadmap.id)).milestones[0].tasks.find((t) => t.kind === "ASSESSMENT")!.completedAt).not.toBeNull();
  });

  it("validates quiz submissions", async () => {
    const user = await makeUser();
    const { roadmap } = await createRoadmapFor(user.id);
    const milestone = (await getRoadmap(user.id, roadmap.id)).milestones[0];
    await expect(submitAttempt(user.id, roadmap.id, milestone.id, { answers: [0] })).rejects.toMatchObject({ status: 400 });
    await expect(submitAttempt(user.id, roadmap.id, milestone.id, { answers: [0, 9, 0] })).rejects.toMatchObject({ status: 400 });
  });

  it("marks a milestone complete only when all of its tasks are done", async () => {
    const user = await makeUser();
    const { roadmap } = await createRoadmapFor(user.id);
    const milestone = (await getRoadmap(user.id, roadmap.id)).milestones[0];
    for (const task of milestone.tasks.filter((t) => t.kind !== "ASSESSMENT")) {
      await updateTask(user.id, roadmap.id, task.id, { completed: true });
    }
    let detail = await getRoadmap(user.id, roadmap.id);
    expect(detail.milestones[0].complete).toBe(false);
    expect(detail.progress.currentWeek).toBe(1);

    await submitAttempt(user.id, roadmap.id, milestone.id, { answers: [0, 1, 1] });
    detail = await getRoadmap(user.id, roadmap.id);
    expect(detail.milestones[0].complete).toBe(true);
    expect(detail.progress).toMatchObject({ completedMilestones: 1, currentMilestone: 2, currentWeek: 2 });
  });
});
