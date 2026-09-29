/**
 * Placement-goal matching — pure functions, no I/O, so every rule is testable.
 *
 * A student may target companies, positions, or both. Each mentor is placed
 * in one tier, and the tier always outranks the topic score:
 *
 *   exact    every requested dimension (company and/or position) is matched
 *   partial  some requested dimensions are matched, not all
 *   related  nothing matched exactly, but the mentor lists a position in the
 *            same family (e.g. AI Researcher for Data Scientist) or teaches
 *            skills that role typically needs
 *   none     nothing placement-related — still shown, ranked by topic fit
 *
 * Explanations only restate what the mentor wrote. A company and a position
 * are described as one job ("as X at Y") only when they came from the same
 * entry, and every claim carries its verification label.
 */

import type { Mentor, MentorExperience } from "./onboarding";

export type PlacementTier = "exact" | "partial" | "related" | "none";

export type PlacementGoals = {
  targetCompanies?: string[];
  targetRoles?: string[];
};

export type PlacementFit = {
  tier: PlacementTier;
  /** Mentor's own labels that matched a target company. */
  matchedCompanies: string[];
  /** Mentor's own labels that matched a target position. */
  matchedPositions: string[];
  /** Positions in the same family as a target, when there was no exact position match. */
  relatedPositions: string[];
  /** Mentor skills that the target positions usually need. */
  relatedSkills: string[];
  /** How many of the requested dimensions (company, position) matched exactly. */
  goalsMatched: number;
  goalsRequested: number;
  bonus: number;
  explanation: string;
};

/* Scoring weights — added on top of the existing topic score. */
export const PLACEMENT_WEIGHTS = {
  company: 14,
  position: 14,
  /** Same entry names both a target company and a target position. */
  sameJob: 6,
  relatedPosition: 6,
  relatedSkills: 3,
} as const;

export const TIER_PRIORITY: Record<PlacementTier, number> = {
  exact: 3,
  partial: 2,
  related: 1,
  none: 0,
};

/* ------------------------------ normalization ------------------------------ */

const COMPANY_SUFFIXES = new Set([
  "inc", "ltd", "limited", "llc", "llp", "pvt", "private", "corp", "corporation", "co", "plc", "gmbh", "india",
]);

const COMPANY_ALIASES: Record<string, string> = {
  "l and t": "larsen and toubro",
  lnt: "larsen and toubro",
  "l t": "larsen and toubro",
  alphabet: "google",
  gs: "goldman sachs",
};

/** Lowercase, "&" → "and", punctuation → spaces. */
export function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function companyKey(value: string) {
  const words = normalizeLabel(value).split(" ").filter(Boolean);
  while (words.length > 1 && COMPANY_SUFFIXES.has(words[words.length - 1])) words.pop();
  const key = words.join(" ");
  return COMPANY_ALIASES[key] ?? key;
}

/** Seniority and internship words don't change which position someone held. */
const POSITION_MODIFIERS = new Set([
  "intern", "internship", "trainee", "senior", "sr", "junior", "jr", "lead", "staff",
  "principal", "associate", "graduate", "i", "ii", "iii", "1", "2", "3",
]);

const POSITION_ALIASES: Record<string, string> = {
  sde: "software development engineer",
  swe: "software development engineer",
  "software engineer": "software development engineer",
  "software developer": "software development engineer",
  "software development engineer sde": "software development engineer",
  ds: "data scientist",
  "ml engineer": "machine learning engineer",
  mle: "machine learning engineer",
  "ai engineer": "machine learning engineer",
  "research scientist": "ai researcher",
  "ml researcher": "ai researcher",
  "machine learning researcher": "ai researcher",
  pm: "product manager",
  apm: "product manager",
  "associate product manager": "product manager",
  "full stack engineer": "full stack developer",
  "fullstack developer": "full stack developer",
  "front end engineer": "frontend engineer",
  "frontend developer": "frontend engineer",
  "back end engineer": "backend engineer",
  "backend developer": "backend engineer",
  sre: "devops engineer",
  "site reliability engineer": "devops engineer",
};

export function positionKey(value: string) {
  const words = normalizeLabel(value).split(" ").filter((word) => !POSITION_MODIFIERS.has(word));
  const key = words.join(" ");
  return POSITION_ALIASES[key] ?? key;
}

/* ------------------------------- role families ------------------------------ */

/**
 * Positions that prepare for each other, and the topics (from the existing
 * topic list) those roles usually interview on. Used for "related" matches
 * and for the prep-topic suggestions in onboarding.
 */
export const POSITION_FAMILIES: { name: string; positions: string[]; topics: string[] }[] = [
  {
    name: "software",
    positions: [
      "software development engineer",
      "backend engineer",
      "frontend engineer",
      "full stack developer",
      "product engineer",
      "devops engineer",
    ],
    topics: ["DSA", "System Design", "OOP", "DBMS", "Operating Systems", "Computer Networks", "Java", "C++"],
  },
  {
    name: "data & AI",
    positions: ["data scientist", "ai researcher", "machine learning engineer", "data analyst"],
    topics: ["Machine Learning", "Deep Learning", "Data Science", "Python", "NumPy & Pandas", "SQL"],
  },
  {
    name: "product",
    positions: ["product manager", "product engineer"],
    topics: ["System Design", "SQL", "Interview Prep"],
  },
  {
    name: "embedded & electronics",
    positions: ["embedded systems engineer", "vlsi engineer", "hardware engineer"],
    topics: ["Embedded C", "Microcontrollers", "VLSI Design", "Verilog", "Digital Electronics"],
  },
  {
    name: "electrical",
    positions: ["electrical engineer", "power systems engineer"],
    topics: ["Electrical Machines", "Power Systems", "Power Electronics", "Control Systems"],
  },
  {
    name: "mechanical",
    positions: ["mechanical design engineer", "mechanical engineer", "manufacturing engineer"],
    topics: ["Machine Design", "SolidWorks", "Thermodynamics", "Strength of Materials", "ANSYS"],
  },
  {
    name: "civil",
    positions: ["structural engineer", "civil engineer", "site engineer"],
    topics: ["Structural Analysis", "STAAD.Pro", "Reinforced Concrete Design", "AutoCAD", "Surveying"],
  },
];

function familiesFor(key: string) {
  return POSITION_FAMILIES.filter((family) => family.positions.includes(key));
}

/** Topics worth preparing for the given positions, in family order, deduplicated. */
export function prepTopicsFor(positions: string[]): string[] {
  const topics = positions.flatMap((value) => familiesFor(positionKey(value)).flatMap((f) => f.topics));
  return [...new Set(topics)];
}

/* --------------------------------- matching --------------------------------- */

function uniqueTargets(values: string[] | undefined, key: (value: string) => string) {
  const seen = new Map<string, string>();
  for (const raw of values ?? []) {
    const trimmed = raw.trim();
    const k = trimmed ? key(trimmed) : "";
    if (k && !seen.has(k)) seen.set(k, trimmed);
  }
  return seen;
}

export function hasPlacementGoals(goals: PlacementGoals) {
  return (
    uniqueTargets(goals.targetCompanies, companyKey).size > 0 ||
    uniqueTargets(goals.targetRoles, positionKey).size > 0
  );
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function joinList(values: string[], conjunction = "and") {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} ${conjunction} ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, ${conjunction} ${values.at(-1)}`;
}

function verificationLabel(entries: MentorExperience[]) {
  return entries.length > 0 && entries.every((entry) => entry.verification === "verified")
    ? "verified"
    : "self-reported";
}

/** Scores one mentor against the student's placement goals. */
export function placementFit(mentor: Mentor, goals: PlacementGoals): PlacementFit {
  const companies = uniqueTargets(goals.targetCompanies, companyKey);
  const positions = uniqueTargets(goals.targetRoles, positionKey);
  const wantsCompany = companies.size > 0;
  const wantsPosition = positions.size > 0;
  const experience = mentor.experience ?? [];

  const companyEntries = experience.filter((e) => e.company && companies.has(companyKey(e.company)));
  const positionEntries = experience.filter((e) => e.position && positions.has(positionKey(e.position)));
  const sameJobEntries = companyEntries.filter((e) => positionEntries.includes(e));

  const matchedCompanies = unique(companyEntries.map((e) => e.company!));
  const matchedPositions = unique(positionEntries.map((e) => e.position!));

  // Related evidence only counts when there's no exact position match to report.
  const targetFamilies = [...positions.keys()].flatMap(familiesFor);
  const relatedEntries =
    matchedPositions.length === 0
      ? experience.filter(
          (e) =>
            e.position &&
            targetFamilies.some((family) => family.positions.includes(positionKey(e.position!))),
        )
      : [];
  const relatedPositions = unique(relatedEntries.map((e) => e.position!));
  const familyTopics = new Set(targetFamilies.flatMap((f) => f.topics).map((t) => t.toLowerCase()));
  const relatedSkills =
    matchedPositions.length === 0
      ? mentor.skills.filter((skill) => familyTopics.has(skill.toLowerCase()))
      : [];

  const goalsRequested = Number(wantsCompany) + Number(wantsPosition);
  const goalsMatched = Number(matchedCompanies.length > 0) + Number(matchedPositions.length > 0);

  const tier: PlacementTier =
    goalsMatched === goalsRequested
      ? "exact"
      : goalsMatched > 0
        ? "partial"
        : relatedPositions.length > 0 || relatedSkills.length > 0
          ? "related"
          : "none";

  const bonus =
    Math.min(2, matchedCompanies.length) * PLACEMENT_WEIGHTS.company +
    Math.min(2, matchedPositions.length) * PLACEMENT_WEIGHTS.position +
    (sameJobEntries.length > 0 ? PLACEMENT_WEIGHTS.sameJob : 0) +
    (relatedPositions.length > 0 ? PLACEMENT_WEIGHTS.relatedPosition : 0) +
    (relatedSkills.length > 0 ? PLACEMENT_WEIGHTS.relatedSkills : 0);

  const explanation = explain({
    wantsCompany,
    wantsPosition,
    targetPositions: [...positions.values()],
    matchedCompanies,
    matchedPositions,
    relatedPositions,
    relatedSkills,
    sameJobEntries,
    companyEntries,
    positionEntries,
    relatedEntries,
  });

  return {
    tier,
    matchedCompanies,
    matchedPositions,
    relatedPositions,
    relatedSkills,
    goalsMatched,
    goalsRequested,
    bonus,
    explanation,
  };
}

function explain(input: {
  wantsCompany: boolean;
  wantsPosition: boolean;
  targetPositions: string[];
  matchedCompanies: string[];
  matchedPositions: string[];
  relatedPositions: string[];
  relatedSkills: string[];
  sameJobEntries: MentorExperience[];
  companyEntries: MentorExperience[];
  positionEntries: MentorExperience[];
  relatedEntries: MentorExperience[];
}) {
  const {
    wantsCompany,
    wantsPosition,
    targetPositions,
    matchedCompanies,
    matchedPositions,
    relatedPositions,
    relatedSkills,
    sameJobEntries,
    companyEntries,
    positionEntries,
    relatedEntries,
  } = input;

  const related = () => {
    if (relatedPositions.length > 0) {
      return `has related ${joinList(relatedPositions)} experience (${verificationLabel(relatedEntries)})`;
    }
    if (relatedSkills.length > 0) return `teaches related skills: ${joinList(relatedSkills.slice(0, 3))}`;
    return "";
  };

  // Company and position both matched.
  if (matchedCompanies.length > 0 && matchedPositions.length > 0) {
    if (sameJobEntries.length > 0) {
      const job = sameJobEntries[0];
      return `Worked as ${job.position} at ${job.company} (${verificationLabel(sameJobEntries)}).`;
    }
    return `Worked at ${joinList(matchedCompanies)} and has ${joinList(matchedPositions)} experience (${verificationLabel([...companyEntries, ...positionEntries])}).`;
  }

  if (matchedCompanies.length > 0) {
    const worked = `Worked at ${joinList(matchedCompanies)} (${verificationLabel(companyEntries)})`;
    if (!wantsPosition) return `${worked}.`;
    const extra = related();
    return extra
      ? `${worked}, but lists no ${joinList(targetPositions, "or")} role — ${extra}.`
      : `${worked}, but lists no ${joinList(targetPositions, "or")} role.`;
  }

  if (matchedPositions.length > 0) {
    const has = `Has ${joinList(matchedPositions)} experience (${verificationLabel(positionEntries)})`;
    return wantsCompany ? `${has}, but not at your target companies.` : `${has}.`;
  }

  const missing =
    wantsCompany && wantsPosition
      ? "Does not match your target company or position"
      : wantsCompany
        ? "Does not match your target company"
        : "No experience listed in your target position";
  const extra = related();
  if (extra) return `${missing}, but ${extra}.`;
  return `${missing} — suggested for subject fit, rating and availability.`;
}
