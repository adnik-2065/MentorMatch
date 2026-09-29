/**
 * Validation for everything a profile write can carry. The server runs
 * `validateProfileInput` on every request — the client uses the same helpers
 * only to show errors inline, never as the source of truth.
 */

import {
  BRANCHES,
  DAYS,
  HOURS,
  YEARS,
  type ExperienceKind,
  type MentorExperience,
  type OnboardingState,
  type Role,
} from "./onboarding";

export const LIMITS = {
  name: 80,
  college: 120,
  label: 80,
  topic: 60,
  topics: 30,
  targets: 10,
  season: 40,
  experience: 12,
} as const;

export const EXPERIENCE_KINDS: { value: ExperienceKind; label: string }[] = [
  { value: "internship", label: "Internship" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "research", label: "Research" },
  { value: "project", label: "Project / freelance" },
];

export const MIN_EXPERIENCE_YEAR = 1990;
export const maxExperienceYear = () => new Date().getFullYear() + 1;

export type ProfileInput = {
  role: Role;
  name: string;
  college: string;
  year: string;
  branch: string;
  learnTopics: string[];
  teachTopics: string[];
  targetCompanies: string[];
  targetRoles: string[];
  placementSeason: string;
  availability: Record<string, string[]>;
  experience: MentorExperience[];
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/* ---------------------------------- helpers --------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Letters, numbers, spaces and the punctuation real names and titles use. */
const LABEL_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .,&'()/+#:-]*$/u;

function text(
  value: unknown,
  field: string,
  errors: Record<string, string>,
  { max, required = false, label }: { max: number; required?: boolean; label: string },
) {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") {
    errors[field] = `${label} must be text.`;
    return "";
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (required && !trimmed) errors[field] = `${label} is required.`;
  else if (trimmed.length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
  return trimmed;
}

/** Trimmed, deduplicated (case-insensitive) list of labels. */
function labelList(
  value: unknown,
  field: string,
  errors: Record<string, string>,
  { maxItems, maxLength, label }: { maxItems: number; maxLength: number; label: string },
) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors[field] = `${label} must be a list.`;
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      errors[field] = `${label} must only contain text.`;
      return [];
    }
    const trimmed = item.trim().replace(/\s+/g, " ");
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    if (trimmed.length > maxLength) {
      errors[field] = `Each entry in ${label.toLowerCase()} must be ${maxLength} characters or fewer.`;
      return [];
    }
    if (!LABEL_PATTERN.test(trimmed)) {
      errors[field] = `"${trimmed}" contains characters we can't accept.`;
      return [];
    }
    seen.add(trimmed.toLowerCase());
    out.push(trimmed);
  }
  if (out.length > maxItems) errors[field] = `Add at most ${maxItems} ${label.toLowerCase()}.`;
  return out;
}

/* ------------------------------ field validators ----------------------------- */

export function validatePlacementSeason(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > LIMITS.season) return `Keep this under ${LIMITS.season} characters.`;
  if (!LABEL_PATTERN.test(trimmed)) return "Use letters and numbers, for example 2027.";
  return null;
}

/** Errors keyed by field name for one experience entry; empty object when valid. */
export function validateExperienceEntry(entry: {
  company?: string | null;
  position?: string | null;
  kind?: string;
  startYear?: number | null;
  endYear?: number | null;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const company = entry.company?.trim() ?? "";
  const position = entry.position?.trim() ?? "";
  if (!company && !position) errors.company = "Add a company, a position, or both.";
  for (const [key, value] of [["company", company], ["position", position]] as const) {
    if (!value) continue;
    if (value.length > LIMITS.label) errors[key] = `Keep this under ${LIMITS.label} characters.`;
    else if (!LABEL_PATTERN.test(value)) errors[key] = "Use letters, numbers and basic punctuation.";
  }
  if (entry.kind !== undefined && !EXPERIENCE_KINDS.some((k) => k.value === entry.kind)) {
    errors.kind = "Choose an experience type.";
  }
  const max = maxExperienceYear();
  const { startYear, endYear } = entry;
  const badYear = (y: unknown) =>
    y !== null && y !== undefined && (!Number.isInteger(y) || (y as number) < MIN_EXPERIENCE_YEAR || (y as number) > max);
  if (badYear(startYear)) errors.startYear = `Enter a year between ${MIN_EXPERIENCE_YEAR} and ${max}.`;
  if (badYear(endYear)) errors.endYear = `Enter a year between ${MIN_EXPERIENCE_YEAR} and ${max}.`;
  if (!errors.startYear && !errors.endYear && startYear && endYear && endYear < startYear) {
    errors.endYear = "End year can't be before the start year.";
  }
  if (!errors.endYear && endYear && !startYear) errors.startYear = "Add a start year too.";
  return errors;
}

/* ---------------------------------- profile --------------------------------- */

export function validateProfileInput(raw: unknown): ValidationResult<ProfileInput> {
  const errors: Record<string, string> = {};
  if (!isRecord(raw)) return { ok: false, errors: { body: "Expected a JSON object." } };

  const role = raw.role;
  if (role !== "junior" && role !== "mentor") errors.role = "Choose whether you're learning or mentoring.";

  const name = text(raw.name, "name", errors, { max: LIMITS.name, required: true, label: "Name" });
  const college = text(raw.college, "college", errors, { max: LIMITS.college, required: true, label: "College" });
  const year = typeof raw.year === "string" ? raw.year : "";
  if (!YEARS.includes(year)) errors.year = "Choose your year.";
  const branch = typeof raw.branch === "string" ? raw.branch : "";
  if (!BRANCHES.includes(branch)) errors.branch = "Choose your branch.";

  const topicOpts = { maxItems: LIMITS.topics, maxLength: LIMITS.topic };
  const learnTopics = labelList(raw.learnTopics, "learnTopics", errors, { ...topicOpts, label: "Subjects" });
  const teachTopics = labelList(raw.teachTopics, "teachTopics", errors, { ...topicOpts, label: "Subjects" });
  if (role === "junior" && learnTopics.length === 0 && !errors.learnTopics) {
    errors.learnTopics = "Pick at least one subject.";
  }
  if (role === "mentor" && teachTopics.length === 0 && !errors.teachTopics) {
    errors.teachTopics = "Pick at least one subject you can teach.";
  }

  const targetOpts = { maxItems: LIMITS.targets, maxLength: LIMITS.label };
  const targetCompanies = labelList(raw.targetCompanies, "targetCompanies", errors, {
    ...targetOpts,
    label: "Companies",
  });
  const targetRoles = labelList(raw.targetRoles, "targetRoles", errors, { ...targetOpts, label: "Positions" });

  const placementSeason = text(raw.placementSeason, "placementSeason", errors, {
    max: LIMITS.season,
    label: "Placement season",
  });
  const seasonError = errors.placementSeason ? null : validatePlacementSeason(placementSeason);
  if (seasonError) errors.placementSeason = seasonError;

  const availability: Record<string, string[]> = {};
  if (raw.availability !== undefined && raw.availability !== null) {
    if (!isRecord(raw.availability)) {
      errors.availability = "Availability must map days to hours.";
    } else {
      for (const [day, hours] of Object.entries(raw.availability)) {
        if (!DAYS.includes(day) || !Array.isArray(hours) || hours.some((h) => typeof h !== "string" || !HOURS.includes(h))) {
          errors.availability = "Availability contains an unknown day or hour.";
          break;
        }
        const unique = HOURS.filter((h) => hours.includes(h));
        if (unique.length) availability[day] = unique;
      }
    }
  }

  const experience: MentorExperience[] = [];
  if (raw.experience !== undefined && raw.experience !== null) {
    if (!Array.isArray(raw.experience)) {
      errors.experience = "Experience must be a list.";
    } else if (raw.experience.length > LIMITS.experience) {
      errors.experience = `Add at most ${LIMITS.experience} experience entries.`;
    } else {
      raw.experience.forEach((item, index) => {
        if (!isRecord(item)) {
          errors[`experience.${index}`] = "Each experience entry must be an object.";
          return;
        }
        const str = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
        const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
        const entry = {
          company: str(item.company) || null,
          position: str(item.position) || null,
          kind: item.kind === undefined || item.kind === null ? undefined : String(item.kind),
          startYear: num(item.startYear),
          endYear: num(item.endYear),
        };
        const entryErrors = validateExperienceEntry(entry);
        for (const [key, message] of Object.entries(entryErrors)) errors[`experience.${index}.${key}`] = message;
        if (Object.keys(entryErrors).length === 0) {
          experience.push({
            company: entry.company,
            position: entry.position,
            kind: entry.kind as ExperienceKind | undefined,
            startYear: entry.startYear,
            endYear: entry.endYear,
            // Clients can't mark their own experience as verified.
            verification: "self-reported",
          });
        }
      });
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      role: role as Role,
      name,
      college,
      year,
      branch,
      learnTopics,
      teachTopics,
      targetCompanies,
      targetRoles,
      placementSeason,
      availability,
      experience,
    },
  };
}

/** The slice of local onboarding state the server stores — email, OTP and bookings stay local. */
export function toProfileInput(state: OnboardingState) {
  return {
    role: state.role,
    name: state.name,
    college: state.college,
    year: state.year,
    branch: state.branch,
    learnTopics: state.learnTopics,
    teachTopics: state.teachTopics,
    targetCompanies: state.targetCompanies,
    targetRoles: state.targetRoles,
    placementSeason: state.placementSeason,
    availability: state.availability,
    experience: state.experience,
  };
}
