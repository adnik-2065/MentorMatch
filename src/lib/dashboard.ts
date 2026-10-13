/**
 * Dashboard mock data.
 *
 * Same contract as `onboarding.ts`: everything is in-memory until the
 * backend lands. Sessions come from `/api/sessions`, the request inbox
 * from `/api/requests`, and the doubt feed from `/api/doubts` — the
 * shapes below are what those endpoints should return.
 */

import { MENTORS, type Mentor } from "./onboarding";

/** "pending" means the junior took a slot but the mentor hasn't accepted it yet. */
export type SessionStatus = "pending" | "confirmed" | "awaiting-rating" | "completed";

export type Session = {
  id: string;
  /** Set when the other person is a listed mentor — lets the card link back to booking. */
  mentorId?: string;
  /** The other person in the session. */
  with: string;
  year: string;
  branch: string;
  topic: string;
  concept: string;
  /** Human day label — "Today", "Tomorrow", or "Thu 2 Oct". */
  day: string;
  time: string;
  length: string;
  status: SessionStatus;
  unread: number;
};

export type Request = {
  id: string;
  /** Set when the request came from a real booking, so accepting can confirm it. */
  bookingId?: string;
  from: string;
  year: string;
  branch: string;
  topic: string;
  /** What the junior actually typed. */
  doubt: string;
  /** Concept gap from the triage call. */
  concept: string;
  asked: string;
  slot: string;
  urgent: boolean;
};

export type Doubt = {
  id: string;
  from: string;
  year: string;
  topic: string;
  text: string;
  asked: string;
  answers: number;
};

export type Recap = {
  id: string;
  topic: string;
  title: string;
  date: string;
  tasks: number;
  done: number;
  /** What the session covered. Written by `/api/recap`; absent on the samples. */
  points?: string[];
  /** The practice tasks `tasks`/`done` count — one line each. */
  nextSteps?: string[];
  /** Which side wrote it, so the card can say so. */
  source?: "ai" | "offline";
};

/* ---------------------------------- Student --------------------------------- */

export const STUDENT = {
  name: "Aditya N.",
  year: "2nd Year",
  branch: "Civil",
  college: "GCE",
  topics: ["Structural Analysis", "AutoCAD", "Engineering Mathematics", "Placement Prep"],
  sessionsDone: 6,
  hoursLearnt: 5,
  streak: 3,
};

export const STUDENT_SESSIONS: Session[] = [
  {
    id: "s1",
    mentorId: "meera",
    with: "Meera J.",
    year: "4th Year",
    branch: "Civil",
    topic: "Structural Analysis",
    concept: "Load paths & support conditions",
    day: "Today",
    time: "6 PM",
    length: "45 min",
    status: "confirmed",
    unread: 2,
  },
  {
    id: "s2",
    mentorId: "vikram",
    with: "Vikram D.",
    year: "3rd Year",
    branch: "Mechanical",
    topic: "Strength of Materials",
    concept: "Shear force & bending moment diagrams",
    day: "Thu 2 Oct",
    time: "7 PM",
    length: "45 min",
    status: "confirmed",
    unread: 0,
  },
];

/** Sessions that finished but haven't been rated — this is what gates the next booking. */
export const STUDENT_TO_RATE: Session[] = [
  {
    id: "s0",
    mentorId: "meera",
    with: "Meera J.",
    year: "4th Year",
    branch: "Civil",
    topic: "AutoCAD",
    concept: "Layers, blocks & plotting to scale",
    day: "Yesterday",
    time: "5 PM",
    length: "30 min",
    status: "awaiting-rating",
    unread: 0,
  },
];

export const RATING_TAGS = [
  "Explained clearly",
  "Patient",
  "Gave me practice work",
  "Knew the subject cold",
  "Started on time",
  "Followed up after",
];

export const STUDENT_RECAPS: Recap[] = [
  {
    id: "r1",
    topic: "AutoCAD",
    title: "Layers, blocks and why your plot came out at the wrong scale",
    date: "Yesterday",
    tasks: 3,
    done: 1,
  },
  {
    id: "r2",
    topic: "Engineering Mathematics",
    title: "Laplace transforms — when to use them instead of solving directly",
    date: "24 Sep",
    tasks: 4,
    done: 4,
  },
];

/** Top rated in the student's subjects — the same ranking the search page uses. */
export function recommendedFor(topics: string[], branch: string): Mentor[] {
  return [...MENTORS]
    .sort((a, b) => {
      const aHas = a.skills.some((s) => topics.includes(s)) ? 1 : 0;
      const bHas = b.skills.some((s) => topics.includes(s)) ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;

      const aBranch = a.branch === branch ? 1 : 0;
      const bBranch = b.branch === branch ? 1 : 0;
      if (aBranch !== bBranch) return bBranch - aBranch;

      return b.rating - a.rating;
    })
    .slice(0, 3);
}

/**
 * The booking page's mentor list — `GET /api/mentors?q=`.
 *
 * Same ranking as `recommendedFor`, but over everyone rather than the top
 * three, and with a text filter across name, subject and branch.
 */
export function searchMentors(
  query: string,
  { topics = [], branch = "" }: { topics?: string[]; branch?: string } = {},
): Mentor[] {
  const q = query.trim().toLowerCase();
  const matches = (m: Mentor) =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    m.branch.toLowerCase().includes(q) ||
    m.skills.some((s) => s.toLowerCase().includes(q));

  return MENTORS.filter(matches).sort((a, b) => {
    const aHas = a.skills.some((s) => topics.includes(s)) ? 1 : 0;
    const bHas = b.skills.some((s) => topics.includes(s)) ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;

    const aBranch = a.branch === branch ? 1 : 0;
    const bBranch = b.branch === branch ? 1 : 0;
    if (aBranch !== bBranch) return bBranch - aBranch;

    return b.rating - a.rating;
  });
}

/* ---------------------------------- Mentor ---------------------------------- */

export const MENTOR_ME = {
  name: "Meera J.",
  year: "4th Year",
  branch: "Civil",
  college: "GCE",
  rating: 4.8,
  reviews: 21,
  /** Confidence-weighted, so a lone 5★ can't outrank a long record. */
  mentorScore: 92,
  sessionsHeld: 34,
  responseTime: "18 min",
  profileViews: 47,
  skills: [
    { topic: "Structural Analysis", confidence: "High" as const },
    { topic: "AutoCAD", confidence: "High" as const },
    { topic: "Surveying", confidence: "Medium" as const },
    { topic: "Estimation & Costing", confidence: null },
  ],
  weeklyHours: 11,
  busiestDay: "Wed",
};

export const MENTOR_REQUESTS: Request[] = [
  {
    id: "q1",
    from: "Aditya N.",
    year: "2nd Year",
    branch: "Civil",
    topic: "Structural Analysis",
    doubt: "My STAAD model shows huge moments at the support and I think my supports are wrong.",
    concept: "Load paths & support conditions",
    asked: "12 min ago",
    slot: "Today 6 PM",
    urgent: true,
  },
  {
    id: "q2",
    from: "Sneha R.",
    year: "1st Year",
    branch: "Civil",
    topic: "AutoCAD",
    doubt: "My drawing prints at the wrong scale no matter what I set in the plot dialog.",
    concept: "Model space vs. paper space",
    asked: "2 hours ago",
    slot: "Wed 5 PM",
    urgent: false,
  },
  {
    id: "q3",
    from: "Imran S.",
    year: "2nd Year",
    branch: "Civil",
    topic: "Surveying",
    doubt: "Total station readings don't close on my traverse — off by about 40 cm.",
    concept: "Traverse closure & error distribution",
    asked: "Yesterday",
    slot: "Sat 10 AM",
    urgent: false,
  },
];

export const MENTOR_SESSIONS: Session[] = [
  {
    id: "m1",
    with: "Aditya N.",
    year: "2nd Year",
    branch: "Civil",
    topic: "Structural Analysis",
    concept: "Load paths & support conditions",
    day: "Today",
    time: "6 PM",
    length: "45 min",
    status: "confirmed",
    unread: 1,
  },
  {
    id: "m2",
    with: "Kavya P.",
    year: "1st Year",
    branch: "Civil",
    topic: "Engineering Drawing",
    concept: "Orthographic projection",
    day: "Tomorrow",
    time: "11 AM",
    length: "30 min",
    status: "confirmed",
    unread: 0,
  },
];

/** Open doubts in the mentor's subjects that nobody has answered yet. */
export const MENTOR_DOUBTS: Doubt[] = [
  {
    id: "d1",
    from: "Rahul V.",
    year: "2nd Year",
    topic: "Concrete Technology",
    text: "Why does my cube test give lower strength at 28 days than at 7 days? Is the mix wrong?",
    asked: "40 min ago",
    answers: 0,
  },
  {
    id: "d2",
    from: "Nandini K.",
    year: "3rd Year",
    topic: "Estimation & Costing",
    text: "How do I take out the quantity of steel for a two-way slab from the bar bending schedule?",
    asked: "3 hours ago",
    answers: 1,
  },
];
