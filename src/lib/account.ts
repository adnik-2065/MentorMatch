"use client";

/**
 * Who is signed in, and what their dashboard should show.
 *
 * Two accounts exist: "me" — whatever you filled in during onboarding,
 * stored in localStorage — and "demo", the seeded profiles used for
 * screenshots and walkthroughs. The demo data only ever appears when you
 * explicitly sign into the demo account.
 *
 * The browser copy drives the dashboards (bookings stay local). The profile,
 * placement goals and mentor experience are also written to the server via
 * `syncProfile` so other students can be matched against them — that call
 * reports honestly when the server has no database configured.
 */

import { useEffect, useState } from "react";
import {
  analyseRepos,
  initialState,
  matchMentors,
  type Mentor,
  type MentorExperience,
  type OnboardingState,
} from "./onboarding";
import { hasPlacementGoals } from "./placement";
import { toProfileInput } from "./profileValidation";
import {
  MENTOR_DOUBTS,
  MENTOR_ME,
  MENTOR_REQUESTS,
  MENTOR_SESSIONS,
  STUDENT,
  STUDENT_RECAPS,
  STUDENT_SESSIONS,
  STUDENT_TO_RATE,
  recommendedFor,
  type Doubt,
  type Recap,
  type Request,
  type Session,
} from "./dashboard";

export type AccountId = "me" | "demo";

const PROFILE_KEY = "mentormatch.profile.v1";
const ACCOUNT_KEY = "mentormatch.account.v1";

/* --------------------------------- storage --------------------------------- */

const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function experienceFrom(value: unknown): MentorExperience[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { company, position, kind, startYear, endYear } = item as Record<string, unknown>;
    const entry: MentorExperience = {
      company: typeof company === "string" && company.trim() ? company : null,
      position: typeof position === "string" && position.trim() ? position : null,
      ...(typeof kind === "string" ? { kind: kind as MentorExperience["kind"] } : {}),
      startYear: typeof startYear === "number" ? startYear : null,
      endYear: typeof endYear === "number" ? endYear : null,
      // Anything read back from the browser is the user's own claim.
      verification: "self-reported",
    };
    return entry.company || entry.position ? [entry] : [];
  });
}

/**
 * Fills in anything a stored profile predates. Profiles saved before
 * placement goals or mentor experience existed load with those empty.
 */
export function normalizeStoredProfile(stored: Partial<OnboardingState>): OnboardingState {
  return {
    ...initialState,
    ...stored,
    learnTopics: strings(stored.learnTopics),
    targetCompanies: strings(stored.targetCompanies),
    targetRoles: strings(stored.targetRoles),
    placementSeason: typeof stored.placementSeason === "string" ? stored.placementSeason : "",
    teachTopics: strings(stored.teachTopics),
    availability: stored.availability && typeof stored.availability === "object"
      ? stored.availability
      : {},
    experience: experienceFrom(stored.experience),
  };
}

export function loadProfile(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return normalizeStoredProfile(JSON.parse(raw) as Partial<OnboardingState>);
  } catch {
    return null;
  }
}

/** Called when onboarding completes — this is what makes the dashboard yours. */
export function saveProfile(state: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(state));
    window.localStorage.setItem(ACCOUNT_KEY, "me");
  } catch {
    // Private mode or a full quota — the dashboard falls back to signed out.
  }
}

/* ---------------------------------- server ---------------------------------- */

export type SyncResult =
  | { status: "saved" }
  /** The server has no database configured — nothing was stored remotely. */
  | { status: "unavailable"; message: string }
  | { status: "invalid"; errors: Record<string, string> }
  | { status: "error"; message: string };

/** Stores the profile server-side so other students can be matched with it. Never reports success it didn't get. */
export async function syncProfile(state: OnboardingState): Promise<SyncResult> {
  try {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toProfileInput(state)),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) return { status: "saved" };
    if (response.status === 503) {
      return { status: "unavailable", message: body.message ?? "Profile storage isn't configured." };
    }
    if (response.status === 422) return { status: "invalid", errors: body.errors ?? {} };
    return { status: "error", message: body.message ?? `Save failed (${response.status}).` };
  } catch {
    return { status: "error", message: "Network error — check your connection and try again." };
  }
}

/** The server copy of your own profile, if this browser has one. */
export async function fetchOwnProfile(): Promise<Partial<OnboardingState> | null> {
  try {
    const response = await fetch("/api/profile", { cache: "no-store" });
    if (!response.ok) return null;
    const { profile } = await response.json();
    return profile ?? null;
  } catch {
    return null;
  }
}

export function currentAccount(): AccountId | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ACCOUNT_KEY);
  return value === "me" || value === "demo" ? value : null;
}

export function signIn(id: AccountId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_KEY, id);
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCOUNT_KEY);
}

/** localStorage is client-only, so everything renders after mount. */
export function useAccount() {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<AccountId | null>(null);
  const [profile, setProfile] = useState<OnboardingState | null>(null);

  useEffect(() => {
    setAccount(currentAccount());
    setProfile(loadProfile());
    setReady(true);
  }, []);

  return { ready, account, profile };
}

/* ---------------------------------- views ---------------------------------- */

export type StudentView = {
  demo: boolean;
  name: string;
  year: string;
  branch: string;
  topics: string[];
  sessions: Session[];
  toRate: Session[];
  recaps: Recap[];
  recommended: Mentor[];
  stats: { sessionsDone: number; hoursLearnt: number; streak: number };
};

export type MentorView = {
  demo: boolean;
  name: string;
  year: string;
  branch: string;
  skills: { topic: string; confidence: "High" | "Medium" | null }[];
  /** Day → hours published, straight from the availability grid. */
  week: Record<string, number>;
  weeklyHours: number;
  busiestDay: string | null;
  requests: Request[];
  sessions: Session[];
  doubts: Doubt[];
  stats: {
    mentorScore: number | null;
    rating: number | null;
    reviews: number;
    sessionsHeld: number;
    responseTime: string | null;
    profileViews: number;
  };
};

function demoStudent(): StudentView {
  return {
    demo: true,
    name: STUDENT.name,
    year: STUDENT.year,
    branch: STUDENT.branch,
    topics: STUDENT.topics,
    sessions: STUDENT_SESSIONS,
    toRate: STUDENT_TO_RATE,
    recaps: STUDENT_RECAPS,
    recommended: recommendedFor(STUDENT.topics, STUDENT.branch),
    stats: {
      sessionsDone: STUDENT.sessionsDone,
      hoursLearnt: STUDENT.hoursLearnt,
      streak: STUDENT.streak,
    },
  };
}

function demoMentor(): MentorView {
  const week: Record<string, number> = { Mon: 2, Tue: 1, Wed: 3, Thu: 2, Fri: 1, Sat: 2, Sun: 0 };
  return {
    demo: true,
    name: MENTOR_ME.name,
    year: MENTOR_ME.year,
    branch: MENTOR_ME.branch,
    skills: MENTOR_ME.skills,
    week,
    weeklyHours: MENTOR_ME.weeklyHours,
    busiestDay: MENTOR_ME.busiestDay,
    requests: MENTOR_REQUESTS,
    sessions: MENTOR_SESSIONS,
    doubts: MENTOR_DOUBTS,
    stats: {
      mentorScore: MENTOR_ME.mentorScore,
      rating: MENTOR_ME.rating,
      reviews: MENTOR_ME.reviews,
      sessionsHeld: MENTOR_ME.sessionsHeld,
      responseTime: MENTOR_ME.responseTime,
      profileViews: MENTOR_ME.profileViews,
    },
  };
}

/** Your own learning dashboard — booking, subjects and name all come from onboarding. */
export function studentView(account: AccountId, profile: OnboardingState | null): StudentView | null {
  if (account === "demo") return demoStudent();
  if (!profile || (profile.role !== "junior" && profile.learnTopics.length === 0)) return null;

  const booking = profile.booking;
  const sessions: Session[] = booking
    ? [
        {
          id: "own-booking",
          with: booking.mentor.name,
          year: booking.mentor.year,
          branch: booking.mentor.branch,
          topic: profile.triage?.topic ?? profile.learnTopics[0] ?? "Session",
          concept: profile.triage?.concept ?? "Booked from your doubt",
          day: booking.day,
          time: booking.time,
          length: "45 min",
          status: "confirmed",
          unread: 0,
        },
      ]
    : [];

  return {
    demo: false,
    name: profile.name.trim() || "You",
    year: profile.year,
    branch: profile.branch,
    topics: profile.learnTopics,
    sessions,
    // A brand new account has nothing to rate and no recaps yet — say so rather than invent.
    toRate: [],
    recaps: [],
    // Placement goals re-rank recommendations; without them the topic ranking is unchanged.
    recommended: hasPlacementGoals(profile)
      ? matchMentors({
          topics: profile.learnTopics,
          branch: profile.branch,
          targetCompanies: profile.targetCompanies,
          targetRoles: profile.targetRoles,
        })
          .slice(0, 3)
          .map((match) => match.mentor)
      : recommendedFor(profile.learnTopics, profile.branch),
    stats: { sessionsDone: 0, hoursLearnt: 0, streak: 0 },
  };
}

/** Your own mentoring dashboard — the week chart is your real availability grid. */
export function mentorView(account: AccountId, profile: OnboardingState | null): MentorView | null {
  if (account === "demo") return demoMentor();
  if (!profile || (profile.role !== "mentor" && profile.teachTopics.length === 0)) return null;

  const findings = profile.proofStatus === "done" ? analyseRepos(profile.teachTopics) : [];
  const week: Record<string, number> = {};
  for (const [day, hours] of Object.entries(profile.availability)) week[day] = hours.length;

  const busiest = Object.entries(week).sort((a, b) => b[1] - a[1])[0];

  return {
    demo: false,
    name: profile.name.trim() || "You",
    year: profile.year,
    branch: profile.branch,
    skills: profile.teachTopics.map((topic) => ({
      topic,
      confidence: findings.find((f) => f.topic === topic)?.confidence ?? null,
    })),
    week,
    weeklyHours: Object.values(week).reduce((n, h) => n + h, 0),
    busiestDay: busiest && busiest[1] > 0 ? busiest[0] : null,
    requests: [],
    sessions: [],
    doubts: [],
    stats: {
      mentorScore: null,
      rating: null,
      reviews: 0,
      sessionsHeld: 0,
      responseTime: null,
      profileViews: 0,
    },
  };
}
