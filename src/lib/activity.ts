/**
 * The last seven days of your own activity, built from the timestamps we
 * actually have — doubts asked and recaps written.
 *
 * The dashboards used to draw a hand-written bar chart for every account,
 * which meant a brand new profile opened on somebody else's week. A real
 * series can be empty, and an empty chart says so.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type ActivitySeries = {
  labels: string[];
  values: number[];
  total: number;
};

/** Buckets epoch timestamps into the seven days ending today, oldest first. */
export function activitySeries(timestamps: number[], now = Date.now()): ActivitySeries {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(end);
    day.setDate(end.getDate() - (6 - i));
    return day;
  });

  const values = days.map((day) => {
    const from = day.getTime();
    const to = from + 86_400_000;
    return timestamps.filter((at) => at >= from && at < to).length;
  });

  return {
    labels: days.map((day) => WEEKDAYS[day.getDay()]),
    values,
    total: values.reduce((n, v) => n + v, 0),
  };
}

/** Change between the first and second half of the window, as a whole percent. */
export function trendPercent(values: number[]): number | null {
  if (values.length < 4) return null;
  const half = Math.floor(values.length / 2);
  const earlier = values.slice(0, half).reduce((n, v) => n + v, 0);
  const later = values.slice(-half).reduce((n, v) => n + v, 0);
  if (earlier === 0) return later === 0 ? null : 100;
  return Math.round(((later - earlier) / earlier) * 100);
}

/**
 * How much of a profile is filled in. The sidebar used to show a flat 76% to
 * everyone, including people who had just typed their name.
 */
export function profileStrength(profile: {
  name: string;
  college: string;
  year: string;
  branch: string;
  role: "junior" | "mentor" | null;
  learnTopics: string[];
  teachTopics: string[];
  availability: Record<string, string[]>;
  targetCompanies: string[];
  targetRoles: string[];
  experience: unknown[];
  github: string;
}): { percent: number; next: string | null } {
  const mentor = profile.role === "mentor";

  const checks: { done: boolean; label: string }[] = [
    { done: Boolean(profile.name.trim()), label: "Add your name" },
    { done: Boolean(profile.college.trim()), label: "Add your college" },
    { done: Boolean(profile.year), label: "Pick your year" },
    { done: Boolean(profile.branch), label: "Pick your branch" },
    mentor
      ? { done: profile.teachTopics.length > 0, label: "Claim a subject you can teach" }
      : { done: profile.learnTopics.length > 0, label: "Pick a subject to learn" },
    mentor
      ? {
          done: Object.values(profile.availability).some((hours) => hours.length > 0),
          label: "Publish some weekly hours",
        }
      : {
          done: profile.targetCompanies.length > 0 || profile.targetRoles.length > 0,
          label: "Add a placement goal",
        },
    mentor
      ? { done: profile.experience.length > 0, label: "Add your experience" }
      : { done: profile.learnTopics.length > 2, label: "Pick a couple more subjects" },
    mentor
      ? { done: Boolean(profile.github.trim()), label: "Connect GitHub for SkillProof" }
      : { done: Boolean(profile.branch && profile.year), label: "Finish the basics" },
  ];

  const done = checks.filter((check) => check.done).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    next: checks.find((check) => !check.done)?.label ?? null,
  };
}
