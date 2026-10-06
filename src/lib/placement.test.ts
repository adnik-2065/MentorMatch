import { describe, expect, it } from "vitest";
import { matchMentors, MENTORS, type Mentor } from "./onboarding";
import { companyKey, hasPlacementGoals, placementFit, positionKey, prepTopicsFor } from "./placement";

const mentor = (overrides: Partial<Mentor>): Mentor => ({
  id: "m",
  name: "Test M.",
  year: "4th Year",
  branch: "CSE",
  rating: 4.5,
  reviews: 10,
  skills: [],
  experience: [],
  verified: "claimed",
  online: false,
  slots: [{ day: "Mon", time: "6 PM" }],
  ...overrides,
});

const ids = (matches: { mentor: Mentor }[]) => matches.map((m) => m.mentor.id);

describe("normalization", () => {
  it("treats common company spellings as the same company", () => {
    expect(companyKey("Google LLC")).toBe(companyKey("google"));
    expect(companyKey("L&T")).toBe(companyKey("Larsen & Toubro"));
  });

  it("treats position aliases and seniority as the same position", () => {
    expect(positionKey("SDE")).toBe(positionKey("Software Development Engineer (SDE)"));
    expect(positionKey("Senior Data Scientist")).toBe(positionKey("Data Scientist"));
    expect(positionKey("PM")).toBe(positionKey("Product Manager"));
  });

  it("ignores blank goals", () => {
    expect(hasPlacementGoals({ targetCompanies: ["  "], targetRoles: [] })).toBe(false);
    expect(hasPlacementGoals({})).toBe(false);
  });

  it("suggests prep topics from the existing topic system for a position", () => {
    expect(prepTopicsFor(["SDE"])).toContain("DSA");
    expect(prepTopicsFor(["Unknown Position"])).toEqual([]);
  });
});

describe("matchMentors without placement goals", () => {
  it("keeps the topic-only ranking and adds no placement data", () => {
    const withoutGoals = matchMentors({ topics: ["Docker"], branch: "CSE" });
    const withEmptyGoals = matchMentors({ topics: ["Docker"], branch: "CSE", targetCompanies: [], targetRoles: [] });
    expect(ids(withEmptyGoals)).toEqual(ids(withoutGoals));
    expect(withoutGoals[0].mentor.id).toBe("aarav");
    expect(withoutGoals.every((m) => m.placement === undefined)).toBe(true);
  });
});

describe("skill search", () => {
  it("filters results to the searched skill instead of only changing their scores", () => {
    const matches = matchMentors({ query: "Java", topics: ["Docker"] });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(MENTORS.length);
    expect(matches.every(({ matchedSkills }) => matchedSkills.some((skill) => /java/i.test(skill)))).toBe(true);
  });

  it("uses blocker keywords to find relevant skills rather than the previous focus topic", () => {
    const matches = matchMentors({ query: "my Docker container exits on startup", topics: ["DSA"] });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every(({ matchedSkills }) => matchedSkills.some((skill) => /docker/i.test(skill)))).toBe(true);
  });

  it("returns no unrelated mentors when the search has no skill match", () => {
    expect(matchMentors({ query: "quantum widget repair", topics: ["Docker"] })).toEqual([]);
  });
});

describe("company-only search", () => {
  const matches = matchMentors({ topics: ["DSA"], targetCompanies: ["Amazon"] });

  it("ranks every mentor with that company above everyone else", () => {
    const amazon = MENTORS.filter((m) => m.experience.some((e) => e.company === "Amazon")).map((m) => m.id);
    expect(ids(matches).slice(0, amazon.length).sort()).toEqual([...amazon].sort());
    expect(matches.slice(0, amazon.length).every((m) => m.placement?.tier === "exact")).toBe(true);
  });

  it("explains the match without inventing a position at the company", () => {
    const karan = matches.find((m) => m.mentor.id === "karan")!;
    expect(karan.placement?.explanation).toBe("Worked at Amazon (self-reported).");
    expect(karan.reasons[0]).toBe(karan.placement?.explanation);
  });
});

describe("position-only search", () => {
  it("matches aliases and ranks exact position matches first", () => {
    const matches = matchMentors({ targetRoles: ["SDE"] });
    const top = matches.filter((m) => m.placement?.tier === "exact").map((m) => m.mentor.id);
    expect(top.sort()).toEqual(["aarav", "nisha", "priya"]);
    expect(matches[0].placement?.explanation).toMatch(/^Has Software Development Engineer \(SDE\) experience \(self-reported\)\.$/);
  });

  it("falls back to related positions and labels them as related", () => {
    const matches = matchMentors({ targetRoles: ["Machine Learning Engineer"] });
    const karan = matches.find((m) => m.mentor.id === "karan")!;
    expect(karan.placement?.tier).toBe("related");
    expect(karan.placement?.explanation).toContain("has related AI Researcher experience (self-reported)");
    expect(karan.placement?.explanation.startsWith("No experience listed in your target position")).toBe(true);
  });
});

describe("combined search", () => {
  const matches = matchMentors({ topics: ["DSA"], targetCompanies: ["Amazon"], targetRoles: ["SDE"] });

  it("puts mentors who match both goals above partial matches", () => {
    expect(matches[0].mentor.id).toBe("aarav");
    expect(matches[0].placement?.tier).toBe("exact");
    const tiers = matches.map((m) => m.placement!.tier);
    const firstPartial = tiers.indexOf("partial");
    expect(firstPartial).toBeGreaterThan(0);
    expect(tiers.slice(0, firstPartial).every((t) => t === "exact")).toBe(true);
    // Karan (Amazon, not SDE) and Priya (SDE, not Amazon) are both partial.
    expect(matches.find((m) => m.mentor.id === "karan")?.placement?.tier).toBe("partial");
    expect(matches.find((m) => m.mentor.id === "priya")?.placement?.tier).toBe("partial");
  });

  it("uses exact wording for full matches and says what's missing for partial ones", () => {
    const aarav = matches[0].placement!;
    expect(aarav.explanation).toBe(
      "Worked at Amazon and has Software Development Engineer (SDE) experience (self-reported).",
    );
    // Sample data never pairs company and position, so no "worked as X at Y" is claimed.
    expect(aarav.explanation).not.toMatch(/Worked as/);

    const priya = matches.find((m) => m.mentor.id === "priya")!.placement!;
    expect(priya.explanation).toBe(
      "Has Software Development Engineer (SDE) experience (self-reported), but not at your target companies.",
    );
    const karan = matches.find((m) => m.mentor.id === "karan")!.placement!;
    expect(karan.explanation).toMatch(/^Worked at Amazon \(self-reported\), but lists no SDE role/);
  });

  it("says 'worked as X at Y' only when one entry names both", () => {
    const fit = placementFit(
      mentor({ experience: [{ company: "Amazon", position: "SDE Intern", verification: "self-reported" }] }),
      { targetCompanies: ["amazon"], targetRoles: ["Software Engineer"] },
    );
    expect(fit.tier).toBe("exact");
    expect(fit.explanation).toBe("Worked as SDE Intern at Amazon (self-reported).");
  });

  it("gives a higher score to the same-job entry than to separate entries", () => {
    const goals = { targetCompanies: ["Amazon"], targetRoles: ["SDE"] };
    const paired = placementFit(mentor({ experience: [{ company: "Amazon", position: "SDE", verification: "self-reported" }] }), goals);
    const split = placementFit(
      mentor({
        experience: [
          { company: "Amazon", position: null, verification: "self-reported" },
          { company: null, position: "SDE", verification: "self-reported" },
        ],
      }),
      goals,
    );
    expect(paired.bonus).toBeGreaterThan(split.bonus);
  });
});

describe("no-match behaviour", () => {
  it("still returns subject matches, labelled as not matching the goal", () => {
    const matches = matchMentors({ topics: ["Structural Analysis"], targetCompanies: ["Netflix"] });
    expect(matches.length).toBe(MENTORS.length);
    expect(matches.every((m) => m.placement?.tier === "none")).toBe(true);
    expect(matches[0].mentor.id).toBe("meera");
    expect(matches[0].placement?.explanation).toBe(
      "Does not match your target company — suggested for subject fit, rating and availability.",
    );
  });

  it("never describes experience a mentor doesn't list", () => {
    const fit = placementFit(mentor({ experience: [] }), { targetCompanies: ["Google"], targetRoles: ["Data Scientist"] });
    expect(fit.tier).toBe("none");
    expect(fit.matchedCompanies).toEqual([]);
    expect(fit.explanation).not.toMatch(/Google|worked/i);
  });

  it("handles mentors without an experience field (legacy data)", () => {
    const legacy = { ...mentor({}), experience: undefined } as unknown as Mentor;
    expect(placementFit(legacy, { targetCompanies: ["Amazon"] }).tier).toBe("none");
  });
});

describe("verification labels", () => {
  it("only says verified when every matching entry is verified", () => {
    const fit = placementFit(
      mentor({ experience: [{ company: "Amazon", position: null, verification: "verified" }] }),
      { targetCompanies: ["Amazon"] },
    );
    expect(fit.explanation).toBe("Worked at Amazon (verified).");
    expect(matchMentors({ targetCompanies: ["Amazon"] }).every((m) => !m.placement?.explanation.includes("(verified)"))).toBe(true);
  });
});
