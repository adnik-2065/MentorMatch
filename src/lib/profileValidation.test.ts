import { describe, expect, it } from "vitest";
import { initialState } from "./onboarding";
import { LIMITS, toProfileInput, validateExperienceEntry, validateProfileInput } from "./profileValidation";

const valid = {
  role: "junior",
  name: "  Asha   Rao ",
  college: "IIT Test",
  year: "2nd Year",
  branch: "CSE",
  learnTopics: ["DSA", "dsa", "Docker"],
  targetCompanies: ["Amazon"],
  targetRoles: ["SDE"],
  placementSeason: "2027",
};

describe("validateProfileInput", () => {
  it("accepts a legacy-shaped body with no placement fields", () => {
    const { targetCompanies: _c, targetRoles: _r, placementSeason: _s, ...legacy } = valid;
    const result = validateProfileInput(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.targetCompanies).toEqual([]);
      expect(result.value.placementSeason).toBe("");
      expect(result.value.experience).toEqual([]);
    }
  });

  it("trims and de-duplicates values", () => {
    const result = validateProfileInput(valid);
    expect(result.ok && result.value.name).toBe("Asha Rao");
    expect(result.ok && result.value.learnTopics).toEqual(["DSA", "Docker"]);
  });

  it("rejects bad shapes and unknown enums", () => {
    const result = validateProfileInput({ ...valid, role: "admin", year: "9th Year", branch: "Magic", targetCompanies: "Amazon" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["branch", "role", "targetCompanies", "year"]);
    expect(validateProfileInput(null)).toEqual({ ok: false, errors: { body: "Expected a JSON object." } });
  });

  it("limits the number of targets and rejects markup", () => {
    const tooMany = Array.from({ length: LIMITS.targets + 1 }, (_, i) => `Company ${i}`);
    const result = validateProfileInput({ ...valid, targetCompanies: tooMany, targetRoles: ["<script>"] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.targetCompanies).toMatch(/at most/);
      expect(result.errors.targetRoles).toMatch(/can't accept/);
    }
  });

  it("requires subjects for the chosen role", () => {
    const result = validateProfileInput({ ...valid, role: "mentor", teachTopics: [] });
    expect(!result.ok && result.errors.teachTopics).toBeTruthy();
  });

  it("forces client-supplied experience to self-reported", () => {
    const result = validateProfileInput({
      ...valid,
      role: "mentor",
      teachTopics: ["Docker"],
      experience: [{ company: "Amazon", position: "SDE", startYear: 2023, verification: "verified" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.experience[0].verification).toBe("self-reported");
  });

  it("reports experience errors per entry and field", () => {
    const result = validateProfileInput({
      ...valid,
      experience: [{ company: "", position: "" }, { company: "Amazon", startYear: 2024, endYear: 2020 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors["experience.0.company"]).toBeTruthy();
      expect(result.errors["experience.1.endYear"]).toMatch(/before the start/);
    }
  });

  it("rejects unknown availability days and hours", () => {
    expect(validateProfileInput({ ...valid, availability: { Funday: ["6 PM"] } }).ok).toBe(false);
  });
});

describe("validateExperienceEntry", () => {
  it("needs a company or a position, and sane years", () => {
    expect(validateExperienceEntry({ company: null, position: null }).company).toBeTruthy();
    expect(validateExperienceEntry({ position: "Data Scientist" })).toEqual({});
    expect(validateExperienceEntry({ company: "Amazon", startYear: 1800 }).startYear).toBeTruthy();
  });
});

describe("toProfileInput", () => {
  it("never sends email, OTP or bookings to the server", () => {
    const input = toProfileInput({ ...initialState, email: "a@b.co", otp: "123456", role: "junior" }) as Record<string, unknown>;
    expect(input).not.toHaveProperty("email");
    expect(input).not.toHaveProperty("otp");
    expect(input).not.toHaveProperty("booking");
  });
});
