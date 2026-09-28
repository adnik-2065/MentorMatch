/**
 * Onboarding data, types and mock logic.
 *
 * Everything here is in-memory for now. When the backend lands, the mock
 * helpers (`runTriage`, `analyseRepos`) get replaced by calls to
 * `/api/match` and `/api/skillproof`, and the topic/mentor lists come
 * from Postgres instead of these constants.
 */

export type Role = "junior" | "mentor";

export type Mentor = {
  id: string;
  name: string;
  year: string;
  branch: string;
  rating: number;
  reviews: number;
  skills: string[];
  verified: "high" | "medium" | "claimed";
  online: boolean;
  slots: { day: string; time: string }[];
};

export type Triage = {
  concept: string;
  explanation: string;
  topic: string;
  mentors: { mentor: Mentor; reason: string }[];
};

export type OnboardingState = {
  // shared
  email: string;
  otp: string;
  verified: boolean;
  name: string;
  college: string;
  year: string;
  branch: string;
  role: Role | null;
  // junior
  learnTopics: string[];
  stuckOn: string;
  triage: Triage | null;
  booking: { mentor: Mentor; day: string; time: string } | null;
  // mentor
  teachTopics: string[];
  github: string;
  proofStatus: "idle" | "analysing" | "done" | "skipped";
  availability: Record<string, string[]>;
};

export const initialState: OnboardingState = {
  email: "",
  otp: "",
  verified: false,
  name: "",
  college: "",
  year: "",
  branch: "",
  role: null,
  learnTopics: [],
  stuckOn: "",
  triage: null,
  booking: null,
  teachTopics: [],
  github: "",
  proofStatus: "idle",
  availability: {},
};

/** Grouped so the picker can show sections, and searched as one flat list. */
export const TOPIC_GROUPS: { name: string; topics: string[] }[] = [
  {
    name: "Languages",
    topics: ["C", "C++", "Java", "Python", "JavaScript", "TypeScript", "C#", "Go", "Rust", "Kotlin", "PHP", "R"],
  },
  {
    name: "Core CS",
    topics: [
      "DSA",
      "DBMS",
      "Operating Systems",
      "Computer Networks",
      "OOP",
      "System Design",
      "Compiler Design",
      "Theory of Computation",
      "Competitive Programming",
    ],
  },
  {
    name: "Web & Mobile",
    topics: [
      "HTML & CSS",
      "React",
      "Next.js",
      "Node.js",
      "Express",
      "Angular",
      "Vue",
      "Django",
      "Flask",
      "Spring Boot",
      "React Native",
      "Flutter",
      "Android",
    ],
  },
  {
    name: "Data & AI",
    topics: [
      "SQL",
      "MongoDB",
      "Machine Learning",
      "Deep Learning",
      "Data Science",
      "NumPy & Pandas",
      "Power BI",
      "Excel",
    ],
  },
  {
    name: "Tools & DevOps",
    topics: ["Git", "GitHub", "Docker", "Kubernetes", "Linux", "AWS", "Firebase", "CI/CD", "Postman"],
  },
  {
    name: "Career",
    topics: ["Placement Prep", "Resume Review", "Interview Prep", "Open Source", "Hackathons", "Internships"],
  },
];

export const TOPICS = TOPIC_GROUPS.flatMap((g) => g.topics);

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export const BRANCHES = ["CSE", "IT", "ECE", "EEE", "Mechanical", "Civil", "Other"];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** One-hour slots from 10 AM to 10 PM — each label is the hour the slot starts. */
export const HOURS = [
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
];

export const AVAILABILITY_PRESETS: { label: string; days: string[]; hours: string[] }[] = [
  {
    label: "Weekday evenings",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    hours: ["6 PM", "7 PM", "8 PM"],
  },
  {
    label: "Weekend mornings",
    days: ["Sat", "Sun"],
    hours: ["10 AM", "11 AM", "12 PM"],
  },
  {
    label: "After classes",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    hours: ["4 PM", "5 PM"],
  },
  {
    label: "Late nights",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    hours: ["8 PM", "9 PM"],
  },
];

export const MENTORS: Mentor[] = [
  {
    id: "aarav",
    name: "Aarav S.",
    year: "3rd Year",
    branch: "CSE",
    rating: 4.9,
    reviews: 32,
    skills: ["Docker", "Git", "Linux"],
    verified: "high",
    online: true,
    slots: [
      { day: "Mon", time: "6 PM" },
      { day: "Tue", time: "7 PM" },
      { day: "Thu", time: "8 PM" },
    ],
  },
  {
    id: "nisha",
    name: "Nisha R.",
    year: "4th Year",
    branch: "IT",
    rating: 4.8,
    reviews: 27,
    skills: ["Docker", "Node.js", "DBMS"],
    verified: "high",
    online: false,
    slots: [
      { day: "Tue", time: "7 PM" },
      { day: "Wed", time: "6 PM" },
    ],
  },
  {
    id: "karan",
    name: "Karan M.",
    year: "3rd Year",
    branch: "CSE",
    rating: 4.6,
    reviews: 19,
    skills: ["C", "Operating Systems", "DSA"],
    verified: "medium",
    online: true,
    slots: [
      { day: "Wed", time: "8 PM" },
      { day: "Fri", time: "6 PM" },
    ],
  },
  {
    id: "priya",
    name: "Priya T.",
    year: "4th Year",
    branch: "CSE",
    rating: 4.7,
    reviews: 24,
    skills: ["Java", "DSA", "SQL"],
    verified: "high",
    online: true,
    slots: [
      { day: "Mon", time: "7 PM" },
      { day: "Thu", time: "6 PM" },
    ],
  },
  {
    id: "rohit",
    name: "Rohit K.",
    year: "2nd Year",
    branch: "IT",
    rating: 4.4,
    reviews: 11,
    skills: ["Git", "JavaScript", "React"],
    verified: "medium",
    online: false,
    slots: [
      { day: "Fri", time: "7 PM" },
      { day: "Sat", time: "5 PM" },
    ],
  },
];

/** Keyword → concept gap. Stands in for the Gemini triage call. */
const TRIAGE_RULES: {
  match: string[];
  topic: string;
  concept: string;
  explanation: string;
}[] = [
  {
    match: ["docker", "container", "compose", "volume", "image", "dockerfile"],
    topic: "Docker",
    concept: "Container lifecycle & volume mounts",
    explanation:
      "Your container exits because nothing holds the main process open, and your edits vanish because the source directory isn't mounted as a volume.",
  },
  {
    match: ["git", "merge", "rebase", "conflict", "commit", "branch", "push"],
    topic: "Git",
    concept: "Branch history & merge conflicts",
    explanation:
      "This isn't really a Git command problem — it's about what a commit graph looks like after diverging branches.",
  },
  {
    match: ["segfault", "pointer", "malloc", "memory", "segmentation", "free"],
    topic: "C",
    concept: "Pointers & manual memory management",
    explanation:
      "The crash is a symptom; the gap is understanding what your pointer actually holds after the allocation.",
  },
  {
    match: ["java", "nullpointer", "jvm", "spring", "class", "object"],
    topic: "Java",
    concept: "References, null safety & object lifecycle",
    explanation:
      "The exception points at the line that failed, not the line where the object was never assigned.",
  },
  {
    match: ["sql", "query", "join", "database", "dbms", "table", "index"],
    topic: "SQL",
    concept: "Joins & query planning",
    explanation:
      "The query returns wrong rows because the join type doesn't match the relationship between your tables.",
  },
];

const DEFAULT_TRIAGE = {
  topic: "DSA",
  concept: "Problem decomposition",
  explanation:
    "Before the code, the gap is breaking the problem into the state you need to track and the transitions between them.",
};

function reasonFor(mentor: Mentor, topic: string) {
  const verified =
    mentor.verified === "claimed" ? "self-claimed" : `${mentor.verified}-confidence verified`;
  return `${verified} in ${topic}, ${mentor.reviews} rated sessions, ${
    mentor.online ? "online right now" : `next free ${mentor.slots[0].day} ${mentor.slots[0].time}`
  }.`;
}

/** Mock of `POST /api/match` — swap for the Gemini call when the API exists. */
export function runTriage(text: string): Triage {
  const lower = text.toLowerCase();
  const rule = TRIAGE_RULES.find((r) => r.match.some((k) => lower.includes(k)));
  const { topic, concept, explanation } = rule ?? DEFAULT_TRIAGE;

  const ranked = [...MENTORS]
    .sort((a, b) => {
      const aHas = a.skills.includes(topic) ? 1 : 0;
      const bHas = b.skills.includes(topic) ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return b.rating - a.rating;
    })
    .slice(0, 3);

  return {
    topic,
    concept,
    explanation,
    mentors: ranked.map((mentor) => ({ mentor, reason: reasonFor(mentor, topic) })),
  };
}

/** Mock of `POST /api/skillproof` — reads repos and returns evidence. */
export function analyseRepos(topics: string[]) {
  const evidence: Record<string, string> = {
    Docker: "4 repos · multi-stage builds · compose networking · 2 CI pipelines",
    Git: "312 commits · 14 merged PRs · rebase workflow · tagged releases",
    Java: "Collections, Streams, JDBC across 3 repos · concurrency untested",
    C: "2 repos · manual allocation, linked lists · no valgrind runs found",
    React: "6 repos · hooks, context, custom hooks · no test coverage",
    Python: "5 repos · scripts + Flask API · type hints partial",
  };
  return topics.slice(0, 3).map((topic) => ({
    topic,
    evidence: evidence[topic] ?? "2 repos referencing this topic · limited commit history",
    confidence: (evidence[topic] ? "High" : "Medium") as "High" | "Medium",
  }));
}
