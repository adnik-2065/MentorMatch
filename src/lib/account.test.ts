import { describe, expect, it } from "vitest";
import { normalizeStoredProfile, studentView } from "./account";
import { initialState, type OnboardingState } from "./onboarding";

/** Shape of a profile saved before placement goals and mentor experience existed. */
const legacy = {
  name: "Asha Rao",
  college: "IIT Test",
  year: "2nd Year",
  branch: "CSE",
  role: "junior",
  learnTopics: ["Docker", "DSA"],
  stuckOn: "",
  triage: null,
  booking: null,
  teachTopics: [],
  availability: {},
} as unknown as Partial<OnboardingState>;

describe("normalizeStoredProfile", () => {
  it("loads a legacy profile with empty placement goals", () => {
    const profile = normalizeStoredProfile(legacy);
    expect(profile.targetCompanies).toEqual([]);
    expect(profile.targetRoles).toEqual([]);
    expect(profile.placementSeason).toBe("");
    expect(profile.experience).toEqual([]);
    expect(profile.learnTopics).toEqual(["Docker", "DSA"]);
  });

  it("drops malformed values instead of crashing", () => {
    const profile = normalizeStoredProfile({
      ...legacy,
      targetCompanies: "Amazon" as unknown as string[],
      targetRoles: [42, "SDE"] as unknown as string[],
      experience: [{ company: "Amazon", verification: "verified" }, "junk", { company: " " }] as never,
    });
    expect(profile.targetCompanies).toEqual([]);
    expect(profile.targetRoles).toEqual(["SDE"]);
    expect(profile.experience).toEqual([
      { company: "Amazon", position: null, startYear: null, endYear: null, verification: "self-reported" },
    ]);
  });

  it("returns the initial state for an empty object", () => {
    expect(normalizeStoredProfile({})).toEqual(initialState);
  });
});

describe("studentView recommendations", () => {
  it("are unchanged for students without goals and goal-driven for students with them", () => {
    const base = normalizeStoredProfile(legacy);
    const without = studentView("me", base)!.recommended.map((m) => m.id);
    const withGoals = studentView("me", { ...base, targetCompanies: ["Google"] })!.recommended.map((m) => m.id);
    expect(without.length).toBeGreaterThan(0);
    expect(withGoals[0]).toBe("priya");
  });
});
