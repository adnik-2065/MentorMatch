import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { decideRevision, requestAdaptiveSuggestions } from "@/lib/roadmap/revisions";
import { getRoadmap, submitAttempt, updateTask } from "@/lib/roadmap/service";
import { createRoadmapFor, fakeProvider, hasDb, makeUser, resetDb } from "../support/helpers";

function adaptiveJson(changes: unknown[] = []) {
  return JSON.stringify({
    summary: "Spend more time on volumes before compose",
    analysis:
      "You missed the volume questions and described bind mounts as confusing. That points to the storage model, though one short quiz is limited evidence.",
    evidence: "limited",
    recommendations: [
      { type: "prerequisite_review", title: "Revisit the container filesystem", detail: "Layers, then writable layer, then volumes." },
      { type: "alternative_explanation", title: "Volumes as USB drives", detail: "Plug the same drive into a new container." },
      { type: "mentor_session", title: "30 minutes on bind mounts", detail: "Walk through your compose file with a mentor." },
    ],
    changes,
  });
}

async function setup() {
  const user = await makeUser();
  const { roadmap } = await createRoadmapFor(user.id);
  const detail = await getRoadmap(user.id, roadmap.id);
  const attempt = await submitAttempt(user.id, roadmap.id, detail.milestones[0].id, {
    answers: [0, 0, 0],
    difficulties: "Bind mounts vs volumes",
  });
  return { user, roadmap, detail, attempt };
}

describe.runIf(hasDb)("adaptive learning", () => {
  beforeEach(resetDb);

  it("turns assessment results and feedback into a pending suggestion without touching the roadmap", async () => {
    const { user, roadmap, attempt } = await setup();
    const provider = fakeProvider([
      adaptiveJson([
        { op: "add_task", milestonePosition: 2, kind: "EXERCISE", title: "Volume drills", description: "Mount, write, restart, verify.", reason: "Missed volume questions" },
        { op: "update_milestone", milestonePosition: 2, estimatedHours: 8, addObjectives: ["Explain bind mounts vs named volumes"] },
      ]),
    ]);

    const { id } = await requestAdaptiveSuggestions(
      user.id,
      roadmap.id,
      { attemptId: attempt.attemptId, difficulties: "I don't get when to use bind mounts" },
      provider,
    );

    // The evidence reached the model; identity didn't.
    const prompt = provider.calls[0].prompt;
    expect(prompt).toContain('"score": 1');
    expect(prompt).toContain("I don't get when to use bind mounts");
    expect(prompt).toContain("What does -d do?"); // the question they missed
    expect(prompt).not.toContain(user.email);

    const detail = await getRoadmap(user.id, roadmap.id);
    const revision = detail.revisions.find((r) => r.id === id)!;
    expect(revision).toMatchObject({ status: "PENDING", source: "ADAPTIVE", evidence: "limited" });
    expect(revision.recommendations).toHaveLength(3);
    expect(revision.changes).toHaveLength(2);
    expect(revision.learnerFeedback).toBe("I don't get when to use bind mounts");

    // Nothing applied yet.
    expect(detail.version).toBe(1);
    expect(detail.milestones[1].tasks).toHaveLength(3);
    expect(detail.milestones[1].estimatedHours).toBe(6);
  });

  it("drops suggested changes to finished milestones", async () => {
    const { user, roadmap, detail } = await setup();
    for (const t of detail.milestones[0].tasks.filter((t) => t.kind !== "ASSESSMENT")) {
      await updateTask(user.id, roadmap.id, t.id, { completed: true });
    }
    await submitAttempt(user.id, roadmap.id, detail.milestones[0].id, { answers: [0, 1, 1] });

    const provider = fakeProvider([
      adaptiveJson([
        { op: "add_task", milestonePosition: 1, kind: "EXERCISE", title: "Redo week one", description: "Again." },
        { op: "add_task", milestonePosition: 3, kind: "EXERCISE", title: "Compose drills", description: "Three services." },
      ]),
    ]);
    const { id } = await requestAdaptiveSuggestions(user.id, roadmap.id, { difficulties: "Compose networking is hazy" }, provider);
    const revision = (await getRoadmap(user.id, roadmap.id)).revisions.find((r) => r.id === id)!;
    expect(revision.changes.map((c) => c.milestonePosition)).toEqual([3]);
  });

  it("applies accepted changes additively, bumps the version and keeps a snapshot", async () => {
    const { user, roadmap, detail } = await setup();
    const done = detail.milestones[1].tasks[0];
    await updateTask(user.id, roadmap.id, done.id, { completed: true, note: "keep me" });

    const provider = fakeProvider([
      adaptiveJson([
        { op: "add_task", milestonePosition: 2, kind: "EXERCISE", title: "Volume drills", description: "Mount, write, restart." },
        { op: "add_resource", milestonePosition: 2, resource: { title: "Storage overview", type: "documentation", url: "https://docs.docker.com/engine/storage/" } },
        { op: "update_milestone", milestonePosition: 2, estimatedHours: 8, addTopics: [{ name: "Bind mounts", subtopics: [] }] },
      ]),
    ]);
    const { id } = await requestAdaptiveSuggestions(user.id, roadmap.id, { difficulties: "Bind mounts are confusing" }, provider);

    const result = await decideRevision(user.id, roadmap.id, id, "accept");
    expect(result).toEqual({ status: "ACCEPTED", version: 2 });

    const after = await getRoadmap(user.id, roadmap.id);
    const week2 = after.milestones[1];
    expect(after.version).toBe(2);
    expect(week2.tasks).toHaveLength(4);
    expect(week2.tasks[3]).toMatchObject({ title: "Volume drills", source: "ADAPTIVE", completedAt: null });
    expect(week2.resources.at(-1)?.title).toBe("Storage overview");
    expect(week2.estimatedHours).toBe(8);
    expect(week2.topics.map((t) => t.name)).toContain("Bind mounts");
    // Completed work survives.
    expect(week2.tasks[0]).toMatchObject({ id: done.id, note: "keep me" });
    expect(week2.tasks[0].completedAt).not.toBeNull();

    const stored = await db().roadmapRevision.findUniqueOrThrow({ where: { id } });
    expect(stored.appliedVersion).toBe(2);
    expect(stored.snapshotBefore).toMatchObject([{ position: 2, estimatedHours: 6 }]);

    // Can't be applied twice.
    await expect(decideRevision(user.id, roadmap.id, id, "accept")).rejects.toMatchObject({ status: 409 });
  });

  it("leaves the roadmap unchanged when a suggestion is rejected, but keeps it as history", async () => {
    const { user, roadmap } = await setup();
    const provider = fakeProvider([
      adaptiveJson([{ op: "add_task", milestonePosition: 2, kind: "EXERCISE", title: "Extra", description: "More." }]),
    ]);
    const { id } = await requestAdaptiveSuggestions(user.id, roadmap.id, { difficulties: "Struggling with the pace" }, provider);
    await decideRevision(user.id, roadmap.id, id, "reject");

    const after = await getRoadmap(user.id, roadmap.id);
    expect(after.version).toBe(1);
    expect(after.milestones[1].tasks).toHaveLength(3);
    expect(after.revisions.find((r) => r.id === id)?.status).toBe("REJECTED");
  });

  it("refuses to apply a suggestion whose milestone was finished in the meantime", async () => {
    const { user, roadmap, detail } = await setup();
    const provider = fakeProvider([
      adaptiveJson([{ op: "add_task", milestonePosition: 1, kind: "EXERCISE", title: "Extra", description: "More." }]),
    ]);
    const { id } = await requestAdaptiveSuggestions(user.id, roadmap.id, { difficulties: "Week one was rough" }, provider);

    for (const t of detail.milestones[0].tasks.filter((t) => t.kind !== "ASSESSMENT")) {
      await updateTask(user.id, roadmap.id, t.id, { completed: true });
    }
    await submitAttempt(user.id, roadmap.id, detail.milestones[0].id, { answers: [0, 1, 1] });

    await expect(decideRevision(user.id, roadmap.id, id, "accept")).rejects.toMatchObject({ status: 409 });
    // The failed accept rolled back — still pending, nothing applied.
    expect((await db().roadmapRevision.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
    expect((await getRoadmap(user.id, roadmap.id)).version).toBe(1);
  });

  it("handles malformed coach output without creating a suggestion", async () => {
    const { user, roadmap } = await setup();
    const provider = fakeProvider(["{}", "definitely not json"]);
    await expect(
      requestAdaptiveSuggestions(user.id, roadmap.id, { difficulties: "Everything is hard" }, provider),
    ).rejects.toMatchObject({ status: 502, code: "ai_invalid_output" });
    expect(await db().roadmapRevision.count()).toBe(0);
  });

  it("won't analyse someone else's roadmap or quiz attempt", async () => {
    const { roadmap, attempt } = await setup();
    const intruder = await makeUser();
    const provider = fakeProvider([adaptiveJson()]);
    await expect(
      requestAdaptiveSuggestions(intruder.id, roadmap.id, { difficulties: "Let me in please" }, provider),
    ).rejects.toMatchObject({ status: 404 });

    const { roadmap: own } = await createRoadmapFor(intruder.id);
    await expect(
      requestAdaptiveSuggestions(intruder.id, own.id, { attemptId: attempt.attemptId, difficulties: "" }, provider),
    ).rejects.toMatchObject({ status: 404 });
    expect(provider.calls).toHaveLength(0);
  });
});
