import { beforeEach, describe, expect, it } from "vitest";
import { decideRevision, proposeMentorRevision } from "@/lib/roadmap/revisions";
import {
  addFeedback,
  getRoadmap,
  listMentors,
  listSharedRoadmaps,
  revokeShare,
  shareRoadmap,
  submitAttempt,
  updateTask,
} from "@/lib/roadmap/service";
import { createRoadmapFor, hasDb, makeUser, resetDb } from "../support/helpers";

async function setup() {
  const learner = await makeUser({ name: "Learner" });
  const mentor = await makeUser({ isMentor: true, name: "Meera J.", teachTopics: ["Docker"] });
  const { roadmap } = await createRoadmapFor(learner.id);
  const detail = await getRoadmap(learner.id, roadmap.id);
  return { learner, mentor, roadmap, detail };
}

describe.runIf(hasDb)("mentor sharing and authorization", () => {
  beforeEach(resetDb);

  it("lists real mentors, ones teaching the skill first, never exposing emails", async () => {
    const learner = await makeUser();
    await makeUser({ isMentor: true, name: "Aarav", teachTopics: ["Git"] });
    await makeUser({ isMentor: true, name: "Nisha", teachTopics: ["Docker"] });
    await makeUser({ name: "Not a mentor" });

    const mentors = await listMentors(learner.id, "docker");
    expect(mentors.map((m) => m.name)).toEqual(["Nisha", "Aarav"]);
    expect(mentors[0].teachesSkill).toBe(true);
    expect(mentors[0]).not.toHaveProperty("email");
  });

  it("hides a roadmap from mentors until the learner shares it", async () => {
    const { mentor, roadmap, detail } = await setup();
    await expect(getRoadmap(mentor.id, roadmap.id)).rejects.toMatchObject({ status: 404 });
    await expect(listSharedRoadmaps(mentor.id)).resolves.toEqual([]);
    await expect(
      addFeedback(mentor.id, roadmap.id, { kind: "GENERAL", body: "Looks good" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      proposeMentorRevision(mentor.id, roadmap.id, {
        summary: "More practice",
        rationale: "Week two needs more drills.",
        changes: [{ op: "add_task", milestonePosition: 2, kind: "EXERCISE", title: "Drills", description: "More." }],
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(detail.shares).toEqual([]);
  });

  it("lets a shared mentor review milestones and progress, but not private notes", async () => {
    const { learner, mentor, roadmap, detail } = await setup();
    await updateTask(learner.id, roadmap.id, detail.milestones[0].tasks[0].id, { completed: true, note: "private thoughts" });
    await shareRoadmap(learner.id, roadmap.id, mentor.id);

    const shared = await listSharedRoadmaps(mentor.id);
    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({ id: roadmap.id, learner: { name: "Learner" } });
    expect(shared[0].progress.completedTasks).toBe(1);

    const view = await getRoadmap(mentor.id, roadmap.id);
    expect(view.viewer).toBe("mentor");
    expect(view.milestones[0].objectives.length).toBeGreaterThan(0);
    expect(view.milestones[0].tasks[0].completedAt).not.toBeNull();
    expect(view.milestones[0].tasks[0]).not.toHaveProperty("note");
    expect(view).not.toHaveProperty("shares");
    // Mentors see the answer key so they can review the quiz.
    expect(view.milestones[0].quiz.questions[0].correctIndex).toBe(0);
  });

  it("doesn't let a mentor change the learner's progress", async () => {
    const { learner, mentor, roadmap, detail } = await setup();
    await shareRoadmap(learner.id, roadmap.id, mentor.id);
    const task = detail.milestones[0].tasks[0];
    await expect(updateTask(mentor.id, roadmap.id, task.id, { completed: true })).rejects.toMatchObject({ status: 404 });
    await expect(
      submitAttempt(mentor.id, roadmap.id, detail.milestones[0].id, { answers: [0, 1, 1] }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(shareRoadmap(mentor.id, roadmap.id, mentor.id)).rejects.toMatchObject({ status: 404 });
  });

  it("records mentor feedback and session recommendations", async () => {
    const { learner, mentor, roadmap, detail } = await setup();
    await shareRoadmap(learner.id, roadmap.id, mentor.id);
    const task = detail.milestones[0].tasks[0];

    await addFeedback(mentor.id, roadmap.id, { kind: "TASK", taskId: task.id, body: "Nice multi-stage build." });
    await addFeedback(mentor.id, roadmap.id, { kind: "SESSION", body: "Let's pair on compose.", sessionTopic: "Compose networking" });

    const seen = await getRoadmap(learner.id, roadmap.id);
    expect(seen.feedback).toHaveLength(2);
    const taskNote = seen.feedback.find((f) => f.kind === "TASK")!;
    expect(taskNote).toMatchObject({ taskId: task.id, milestoneId: detail.milestones[0].id, mentor: { name: "Meera J." } });
    // No server-side booking yet — the extension point returns no link rather than a fake one.
    expect(seen.feedback.find((f) => f.kind === "SESSION")!.bookingHref).toBeNull();
  });

  it("rejects feedback that points at another roadmap's task", async () => {
    const { learner, mentor, roadmap } = await setup();
    await shareRoadmap(learner.id, roadmap.id, mentor.id);
    const { roadmap: other } = await createRoadmapFor(learner.id);
    const foreignTask = (await getRoadmap(learner.id, other.id)).milestones[0].tasks[0];
    await expect(
      addFeedback(mentor.id, roadmap.id, { kind: "TASK", taskId: foreignTask.id, body: "Sneaky" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("requires learner approval before a mentor's proposal changes anything", async () => {
    const { learner, mentor, roadmap } = await setup();
    await shareRoadmap(learner.id, roadmap.id, mentor.id);

    const { id } = await proposeMentorRevision(mentor.id, roadmap.id, {
      summary: "Add a networking lab",
      rationale: "Compose networking trips everyone up; a lab before week three helps.",
      changes: [
        { op: "add_task", milestonePosition: 2, kind: "ASSIGNMENT", title: "Networking lab", description: "Two containers, one network." },
        { op: "add_resource", milestonePosition: 2, resource: { title: "Networking overview", type: "documentation", url: "javascript:alert(1)" } },
      ],
    });

    let seen = await getRoadmap(learner.id, roadmap.id);
    expect(seen.milestones[1].tasks).toHaveLength(3);
    expect(seen.revisions[0]).toMatchObject({ id, source: "MENTOR", status: "PENDING", proposedBy: { name: "Meera J." } });
    // The unsafe link was stripped on the way in.
    expect(seen.revisions[0].changes[1]).toMatchObject({ resource: { title: "Networking overview" } });
    expect((seen.revisions[0].changes[1] as { resource: { url?: string } }).resource.url).toBeUndefined();

    // Only the learner decides.
    await expect(decideRevision(mentor.id, roadmap.id, id, "accept")).rejects.toMatchObject({ status: 404 });
    await decideRevision(learner.id, roadmap.id, id, "accept");

    seen = await getRoadmap(learner.id, roadmap.id);
    expect(seen.milestones[1].tasks.at(-1)).toMatchObject({ title: "Networking lab", source: "MENTOR" });
  });

  it("won't let a mentor propose changes to finished or missing milestones", async () => {
    const { learner, mentor, roadmap, detail } = await setup();
    await shareRoadmap(learner.id, roadmap.id, mentor.id);
    for (const t of detail.milestones[0].tasks.filter((t) => t.kind !== "ASSESSMENT")) {
      await updateTask(learner.id, roadmap.id, t.id, { completed: true });
    }
    await submitAttempt(learner.id, roadmap.id, detail.milestones[0].id, { answers: [0, 1, 1] });

    for (const milestonePosition of [1, 9]) {
      await expect(
        proposeMentorRevision(mentor.id, roadmap.id, {
          summary: "Change",
          rationale: "Because it would help.",
          changes: [{ op: "add_task", milestonePosition, kind: "EXERCISE", title: "More", description: "More." }],
        }),
      ).rejects.toMatchObject({ status: 400 });
    }
  });

  it("cuts off access immediately when the learner revokes the share", async () => {
    const { learner, mentor, roadmap } = await setup();
    const share = await shareRoadmap(learner.id, roadmap.id, mentor.id);
    await expect(getRoadmap(mentor.id, roadmap.id)).resolves.toBeTruthy();

    await revokeShare(learner.id, roadmap.id, share.id);
    await expect(getRoadmap(mentor.id, roadmap.id)).rejects.toMatchObject({ status: 404 });
    await expect(listSharedRoadmaps(mentor.id)).resolves.toEqual([]);

    // Re-sharing restores it.
    await shareRoadmap(learner.id, roadmap.id, mentor.id);
    await expect(getRoadmap(mentor.id, roadmap.id)).resolves.toBeTruthy();
  });

  it("only shares with actual mentors, and only the owner can share or revoke", async () => {
    const { learner, mentor, roadmap } = await setup();
    const notMentor = await makeUser();
    await expect(shareRoadmap(learner.id, roadmap.id, notMentor.id)).rejects.toMatchObject({ status: 404 });
    await expect(shareRoadmap(learner.id, roadmap.id, learner.id)).rejects.toMatchObject({ status: 400 });

    const share = await shareRoadmap(learner.id, roadmap.id, mentor.id);
    const stranger = await makeUser({ isMentor: true });
    await expect(shareRoadmap(stranger.id, roadmap.id, stranger.id)).rejects.toMatchObject({ status: 404 });
    await expect(revokeShare(stranger.id, roadmap.id, share.id)).rejects.toMatchObject({ status: 404 });
    await expect(revokeShare(mentor.id, roadmap.id, share.id)).rejects.toMatchObject({ status: 404 });
  });

  it("a share on one roadmap grants nothing on the learner's others", async () => {
    const { learner, mentor, roadmap } = await setup();
    await shareRoadmap(learner.id, roadmap.id, mentor.id);
    const { roadmap: privateOne } = await createRoadmapFor(learner.id);
    await expect(getRoadmap(mentor.id, privateOne.id)).rejects.toMatchObject({ status: 404 });
  });
});
