import { describe, expect, it } from "vitest";
import { matchMentors } from "@/lib/onboarding";
import { hashOwnerToken, newOwnerToken } from "./ownerToken";
import { getOwnProfile, listPublicMentors, putOwnProfile } from "./profileApi";
import { memoryProfileStore } from "./testing";

const junior = {
  role: "junior",
  name: "Asha Rao",
  college: "IIT Test",
  year: "2nd Year",
  branch: "CSE",
  learnTopics: ["DSA"],
  targetCompanies: ["Amazon"],
  targetRoles: ["Data Scientist"],
  placementSeason: "2027",
};

const mentorBody = {
  role: "mentor",
  name: "Ravi Kumar Singh",
  college: "IIT Test",
  year: "4th Year",
  branch: "CSE",
  teachTopics: ["Machine Learning"],
  availability: { Mon: ["6 PM"] },
  experience: [{ company: "Flipkart", position: "Data Scientist", kind: "internship", startYear: 2025, endYear: 2025 }],
};

describe("without a database", () => {
  it("reports that storage isn't configured instead of pretending to save", async () => {
    for (const result of [
      await getOwnProfile(null, undefined),
      await putOwnProfile(null, undefined, junior),
      await listPublicMentors(null),
    ]) {
      expect(result.status).toBe(503);
      expect(result.body).toMatchObject({ error: "database_not_configured" });
      expect(result.setOwnerToken).toBeUndefined();
    }
  });
});

describe("PUT /api/profile", () => {
  it("rejects invalid input without writing anything", async () => {
    const store = memoryProfileStore();
    const result = await putOwnProfile(store, undefined, { ...junior, year: "7th Year", targetCompanies: [1] });
    expect(result.status).toBe(422);
    expect(result.body).toMatchObject({ error: "invalid_profile" });
    expect(store.writes).toBe(0);
    expect(result.setOwnerToken).toBeUndefined();
  });

  it("issues an owner token on first save and stores only its hash", async () => {
    const store = memoryProfileStore();
    const result = await putOwnProfile(store, undefined, junior);
    expect(result.status).toBe(200);
    const token = result.setOwnerToken!;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect([...store.rows.keys()]).toEqual([hashOwnerToken(token)]);
    expect([...store.rows.keys()]).not.toContain(token);
  });

  it("updates the same profile when the owner saves again, and persists goals", async () => {
    const store = memoryProfileStore();
    const token = (await putOwnProfile(store, undefined, junior)).setOwnerToken!;
    const again = await putOwnProfile(store, token, { ...junior, targetCompanies: ["Google"] });
    expect(again.setOwnerToken).toBeUndefined();
    expect(store.rows.size).toBe(1);
    const read = await getOwnProfile(store, token);
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({ profile: { targetCompanies: ["Google"], targetRoles: ["Data Scientist"], placementSeason: "2027" } });
  });

  it("treats a forged or malformed token as a new user, never as someone else", async () => {
    const store = memoryProfileStore();
    const owner = (await putOwnProfile(store, undefined, junior)).setOwnerToken!;
    const other = await putOwnProfile(store, "not-a-token", { ...junior, name: "Mallory" });
    expect(other.setOwnerToken).toBeDefined();
    expect(other.setOwnerToken).not.toBe(owner);
    expect(store.rows.size).toBe(2);
    expect((await getOwnProfile(store, owner)).body).toMatchObject({ profile: { name: "Asha Rao" } });
  });
});

describe("GET /api/profile", () => {
  it("only returns the caller's own profile", async () => {
    const store = memoryProfileStore();
    await putOwnProfile(store, undefined, junior);
    expect((await getOwnProfile(store, undefined)).status).toBe(404);
    expect((await getOwnProfile(store, newOwnerToken())).status).toBe(404);
    expect((await getOwnProfile(store, "../../etc")).status).toBe(404);
  });
});

describe("GET /api/mentors", () => {
  it("lists registered mentors without private fields and matches them across users", async () => {
    const store = memoryProfileStore();
    await putOwnProfile(store, undefined, mentorBody);
    await putOwnProfile(store, undefined, junior);

    const result = await listPublicMentors(store);
    const { mentors } = result.body as { mentors: import("@/lib/onboarding").Mentor[] };
    expect(mentors).toHaveLength(1);
    expect(mentors[0]).toMatchObject({ name: "Ravi S.", rating: 0, reviews: 0, verified: "claimed", source: "registered" });
    expect(mentors[0]).not.toHaveProperty("college");
    expect(mentors[0].experience[0].verification).toBe("self-reported");

    // A student targeting Data Scientist positions sees the registered mentor as an exact match.
    const [top] = matchMentors({ targetRoles: ["Data Scientist"], targetCompanies: ["Flipkart"] }, mentors);
    expect(top.placement?.tier).toBe("exact");
    expect(top.placement?.explanation).toBe("Worked as Data Scientist at Flipkart (self-reported).");
  });
});

describe("store failures", () => {
  it("returns a generic 500 without leaking the error", async () => {
    const store = memoryProfileStore();
    store.saveForOwner = async () => {
      throw new Error("connection refused 10.0.0.5:5432");
    };
    const original = console.error;
    console.error = () => {};
    const result = await putOwnProfile(store, undefined, junior);
    console.error = original;
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toContain("10.0.0.5");
  });
});
