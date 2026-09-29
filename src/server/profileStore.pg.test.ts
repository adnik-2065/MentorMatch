/**
 * Runs against a real Postgres when TEST_DATABASE_URL is set (the schema is
 * applied first; use a throwaway database). Skipped otherwise.
 */
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateProfileInput, type ProfileInput } from "@/lib/profileValidation";
import { hashOwnerToken, newOwnerToken } from "./ownerToken";
import { pgProfileStore } from "./profileStore";

const url = process.env.TEST_DATABASE_URL;

const input = (raw: Record<string, unknown>): ProfileInput => {
  const result = validateProfileInput(raw);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
};

describe.skipIf(!url)("pgProfileStore (Postgres)", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(await readFile(new URL("../../db/schema.sql", import.meta.url), "utf8"));
    await pool.query("truncate profiles cascade");
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("persists placement goals and mentor experience, and replaces them on update", async () => {
    const store = pgProfileStore(pool);
    const owner = hashOwnerToken(newOwnerToken());
    const first = await store.saveForOwner(
      owner,
      input({
        role: "junior",
        name: "Asha Rao",
        college: "IIT Test",
        year: "2nd Year",
        branch: "CSE",
        learnTopics: ["DSA"],
        targetCompanies: ["Amazon", "amazon.com"],
        targetRoles: ["SDE", "Software Engineer", "Data Scientist"],
        placementSeason: "2027",
      }),
    );
    // "SDE" and "Software Engineer" share a match key, as do the two Amazon spellings.
    expect(first.targetCompanies).toEqual(["Amazon"]);
    expect(first.targetRoles).toEqual(["SDE", "Data Scientist"]);

    const second = await store.saveForOwner(owner, { ...input({ ...first }), targetCompanies: [], placementSeason: "" });
    expect(second.id).toBe(first.id);
    expect(second.targetCompanies).toEqual([]);
    expect(second.placementSeason).toBe("");
    expect(await store.findByOwner(hashOwnerToken(newOwnerToken()))).toBeNull();
  });

  it("lists bookable registered mentors with self-reported experience only", async () => {
    const store = pgProfileStore(pool);
    await store.saveForOwner(
      hashOwnerToken(newOwnerToken()),
      input({
        role: "mentor",
        name: "Ravi Kumar",
        college: "IIT Test",
        year: "4th Year",
        branch: "CSE",
        teachTopics: ["Machine Learning"],
        availability: { Tue: ["7 PM"] },
        experience: [{ company: "Flipkart", position: "Data Scientist", startYear: 2025, verification: "verified" }],
      }),
    );
    await store.saveForOwner(
      hashOwnerToken(newOwnerToken()),
      input({ role: "mentor", name: "No Slots", college: "X", year: "4th Year", branch: "CSE", teachTopics: ["DSA"] }),
    );

    const mentors = await store.listMentors();
    expect(mentors.map((m) => m.name)).toEqual(["Ravi K."]);
    expect(mentors[0].experience).toEqual([
      { company: "Flipkart", position: "Data Scientist", startYear: 2025, endYear: null, verification: "self-reported" },
    ]);
    expect(mentors[0]).not.toHaveProperty("college");
  });
});
