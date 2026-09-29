import { beforeEach, describe, expect, it, vi } from "vitest";

// Route handlers read the session from next/headers; give them an in-memory cookie jar.
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

import { POST as requestCode } from "@/app/api/auth/code/route";
import { POST as signOut } from "@/app/api/auth/signout/route";
import { POST as verifyCode } from "@/app/api/auth/verify/route";
import { GET as me } from "@/app/api/me/route";
import { POST as createRequest } from "@/app/api/roadmap-requests/route";
import { DELETE as deleteRoadmap, GET as getRoadmapRoute } from "@/app/api/roadmaps/[id]/route";
import { GET as listRoadmapsRoute } from "@/app/api/roadmaps/route";
import { PATCH as patchTask } from "@/app/api/roadmaps/[id]/tasks/[taskId]/route";
import { db } from "@/lib/server/db";
import { createRoadmapFor, hasDb, makeUser, params, request, resetDb, validPreference } from "../support/helpers";

/** Signs in through the real endpoints, reading the dev-mode code from the console. */
async function signIn(email: string, profile?: Record<string, unknown>) {
  const spy = vi.spyOn(console, "info").mockImplementation(() => {});
  const sent = await requestCode(request("POST", "/api/auth/code", { email }), undefined);
  expect(sent.status).toBe(200);
  const code = String(spy.mock.calls.at(-1)?.[0]).match(/(\d{6})/)![1];
  spy.mockRestore();
  const res = await verifyCode(request("POST", "/api/auth/verify", { email, code, profile }), undefined);
  expect(res.status).toBe(200);
  return (await res.json()).user as { id: string; isMentor: boolean; name: string };
}

describe.runIf(hasDb)("HTTP layer: authentication and authorization", () => {
  beforeEach(async () => {
    jar.clear();
    await resetDb();
  });

  it("signs in with a college email code, syncs the profile, and signs out", async () => {
    const user = await signIn("asha@iitb.ac.in", { name: "Asha", role: "mentor", teachTopics: ["Docker"] });
    expect(user).toMatchObject({ name: "Asha", isMentor: true });
    expect(jar.get("mm_session")).toBeTruthy();

    // The database stores only a hash of the session token.
    const stored = await db().authSession.findFirstOrThrow();
    expect(stored.tokenHash).not.toBe(jar.get("mm_session"));

    const current = await (await me(request("GET", "/api/me"), undefined)).json();
    expect(current.user.id).toBe(user.id);

    await signOut(request("POST", "/api/auth/signout"), undefined);
    expect(jar.has("mm_session")).toBe(false);
    expect(await db().authSession.count()).toBe(0);
  });

  it("rejects non-college emails, wrong codes, and reused codes", async () => {
    const bad = await requestCode(request("POST", "/api/auth/code", { email: "x@gmail.com" }), undefined);
    expect(bad.status).toBe(400);

    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    await requestCode(request("POST", "/api/auth/code", { email: "ravi@nitk.edu" }), undefined);
    const code = String(spy.mock.calls.at(-1)?.[0]).match(/(\d{6})/)![1];
    spy.mockRestore();

    const wrong = code === "100000" ? "111111" : "100000";
    const denied = await verifyCode(request("POST", "/api/auth/verify", { email: "ravi@nitk.edu", code: wrong }), undefined);
    expect(denied.status).toBe(400);
    expect(jar.has("mm_session")).toBe(false);

    const ok = await verifyCode(request("POST", "/api/auth/verify", { email: "ravi@nitk.edu", code }), undefined);
    expect(ok.status).toBe(200);
    const reused = await verifyCode(request("POST", "/api/auth/verify", { email: "ravi@nitk.edu", code }), undefined);
    expect(reused.status).toBe(400);
  });

  it("issues six-digit codes and verifies only the exact six digits", async () => {
    const email = "otp.check@iitb.ac.in";
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    await requestCode(request("POST", "/api/auth/code", { email }), undefined);
    const printed = String(spy.mock.calls.at(-1)?.[0]).match(/: (\S+)\s*$/)![1];
    spy.mockRestore();
    expect(printed).toMatch(/^[1-9]\d{5}$/);

    // Only an HMAC is stored, never the code itself.
    const challenge = await db().otpChallenge.findFirstOrThrow({ where: { email } });
    expect(challenge.codeHash).not.toContain(printed);

    // Wrong lengths are rejected by validation, before they can use up an attempt.
    for (const bad of [printed.slice(1), printed.slice(0, 5), `${printed}0`, "12345a"]) {
      const res = await verifyCode(request("POST", "/api/auth/verify", { email, code: bad }), undefined);
      expect(res.status, bad).toBe(400);
      expect((await res.json()).error.fields.code).toEqual(["The code is 6 digits"]);
    }
    expect((await db().otpChallenge.findUniqueOrThrow({ where: { id: challenge.id } })).attempts).toBe(0);
    expect(jar.has("mm_session")).toBe(false);

    const ok = await verifyCode(request("POST", "/api/auth/verify", { email, code: ` ${printed} ` }), undefined);
    expect(ok.status).toBe(200);
    expect(jar.get("mm_session")).toBeTruthy();
  });

  it("locks a code after five wrong six-digit guesses", async () => {
    const email = "otp.guess@iitb.ac.in";
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    await requestCode(request("POST", "/api/auth/code", { email }), undefined);
    const code = String(spy.mock.calls.at(-1)?.[0]).match(/(\d{6})\s*$/)![1];
    spy.mockRestore();
    const wrong = code === "100000" ? "100001" : "100000";

    for (let i = 0; i < 5; i++) {
      expect((await verifyCode(request("POST", "/api/auth/verify", { email, code: wrong }), undefined)).status).toBe(400);
    }
    // Even the right code is refused once the attempts are spent.
    const locked = await verifyCode(request("POST", "/api/auth/verify", { email, code }), undefined);
    expect(locked.status).toBe(429);
    expect(jar.has("mm_session")).toBe(false);
  });

  it("rate-limits code requests per email", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await requestCode(request("POST", "/api/auth/code", { email: "spam@iitb.ac.in" }), undefined)).status);
    }
    spy.mockRestore();
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("requires a session for roadmap endpoints", async () => {
    const res = await listRoadmapsRoute(request("GET", "/api/roadmaps"), undefined);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");
  });

  it("validates onboarding input on the server and returns field errors", async () => {
    await signIn("meera@iitb.ac.in");
    const res = await createRequest(
      request("POST", "/api/roadmap-requests", { ...validPreference, skill: "", targetLevel: "COMPLETE_BEGINNER" }),
      undefined,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Object.keys(body.error.fields)).toEqual(expect.arrayContaining(["skill", "targetLevel"]));

    const good = await createRequest(request("POST", "/api/roadmap-requests", validPreference), undefined);
    expect(good.status).toBe(201);
  });

  it("returns 404 — not 403 — for another student's roadmap, on every verb", async () => {
    const owner = await makeUser();
    const { roadmap } = await createRoadmapFor(owner.id);
    const task = await db().roadmapTask.findFirstOrThrow({ where: { roadmapId: roadmap.id } });

    await signIn("intruder@iitb.ac.in");
    const read = await getRoadmapRoute(request("GET", `/api/roadmaps/${roadmap.id}`), params({ id: roadmap.id }));
    expect(read.status).toBe(404);

    const write = await patchTask(
      request("PATCH", `/api/roadmaps/${roadmap.id}/tasks/${task.id}`, { completed: true }),
      params({ id: roadmap.id, taskId: task.id }),
    );
    expect(write.status).toBe(404);

    const remove = await deleteRoadmap(
      request("DELETE", `/api/roadmaps/${roadmap.id}`, { confirm: true }),
      params({ id: roadmap.id }),
    );
    expect(remove.status).toBe(404);

    expect(await db().learningRoadmap.count()).toBe(1);
    expect(await db().taskProgress.count()).toBe(0);
  });

  it("blocks cross-site mutations even with a valid session", async () => {
    const user = await signIn("owner@iitb.ac.in");
    const { roadmap } = await createRoadmapFor(user.id);
    const res = await deleteRoadmap(
      request("DELETE", `/api/roadmaps/${roadmap.id}`, { confirm: true }, { origin: "https://evil.example" }),
      params({ id: roadmap.id }),
    );
    expect(res.status).toBe(403);
    expect(await db().learningRoadmap.count()).toBe(1);
  });

  it("requires explicit confirmation to delete", async () => {
    const user = await signIn("owner2@iitb.ac.in");
    const { roadmap } = await createRoadmapFor(user.id);
    const unconfirmed = await deleteRoadmap(request("DELETE", `/api/roadmaps/${roadmap.id}`, {}), params({ id: roadmap.id }));
    expect(unconfirmed.status).toBe(400);
    const confirmed = await deleteRoadmap(
      request("DELETE", `/api/roadmaps/${roadmap.id}`, { confirm: true }),
      params({ id: roadmap.id }),
    );
    expect(confirmed.status).toBe(200);
    expect(await db().learningRoadmap.count()).toBe(0);
  });

  it("hides internal errors behind a generic message", async () => {
    await signIn("curious@iitb.ac.in");
    const res = await createRequest(
      new (await import("next/server")).NextRequest("http://localhost:3000/api/roadmap-requests", {
        method: "POST",
        headers: { host: "localhost:3000" },
        body: "{not json",
      }),
      undefined,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe("Request body must be valid JSON.");
  });
});
