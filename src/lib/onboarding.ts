/**
 * Onboarding data, types and mock logic.
 *
 * Topics, triage and SkillProof are still in-memory mocks (`runTriage`,
 * `analyseRepos`). Mentor profiles registered through onboarding are stored
 * in Postgres (see `src/server/`) and ranked alongside the sample `MENTORS`
 * by `matchMentors`.
 */

import { hasPlacementGoals, placementFit, TIER_PRIORITY, type PlacementFit } from "./placement";

export type Role = "junior" | "mentor";

/**
 * One line of a mentor's work history. Company and position are separate
 * fields so a student can match on either — and an entry may carry only one
 * of them (a company without a stated role, or a role outside a company).
 * Nothing on the platform checks employment yet, so everything written by a
 * mentor is stored as "self-reported"; "verified" is reserved for a real
 * verification process and the server never sets it.
 */
export type ExperienceKind = "internship" | "full-time" | "part-time" | "research" | "project";
export type ExperienceVerification = "self-reported" | "verified";

export type MentorExperience = {
  company: string | null;
  position: string | null;
  kind?: ExperienceKind;
  startYear?: number | null;
  /** null with a startYear means "present". */
  endYear?: number | null;
  verification: ExperienceVerification;
};

export type Mentor = {
  id: string;
  name: string;
  year: string;
  branch: string;
  rating: number;
  reviews: number;
  skills: string[];
  experience: MentorExperience[];
  verified: "high" | "medium" | "claimed";
  online: boolean;
  slots: { day: string; time: string }[];
  /** "sample" profiles ship with the app for demos; "registered" ones come from the database. */
  source?: "sample" | "registered";
};

export type Triage = {
  concept: string;
  explanation: string;
  topic: string;
  mentors: { mentor: Mentor; reason: string }[];
};

export type MentorMatch = {
  mentor: Mentor;
  score: number;
  matchedSkills: string[];
  reasons: string[];
  /** Only present when the student set a target company or position. */
  placement?: PlacementFit;
};

export type MatchPreferences = {
  query?: string;
  topics?: string[];
  branch?: string;
  verifiedOnly?: boolean;
  onlineOnly?: boolean;
  targetCompanies?: string[];
  targetRoles?: string[];
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
  targetCompanies: string[];
  /** Target positions. The key predates the "position" wording and is kept so stored profiles still load. */
  targetRoles: string[];
  placementSeason: string;
  stuckOn: string;
  triage: Triage | null;
  booking: { mentor: Mentor; day: string; time: string } | null;
  // mentor
  teachTopics: string[];
  github: string;
  proofStatus: "idle" | "analysing" | "done" | "skipped";
  availability: Record<string, string[]>;
  experience: MentorExperience[];
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
  targetCompanies: [],
  targetRoles: [],
  placementSeason: "",
  stuckOn: "",
  triage: null,
  booking: null,
  teachTopics: [],
  github: "",
  proofStatus: "idle",
  availability: {},
  experience: [],
};

export type TopicGroup = { name: string; topics: string[] };

/*
 * Topics are per branch — a Civil junior should never have to scroll past
 * Kubernetes to find Surveying. Group names are unique across every branch,
 * because the "all branches" view lists them flat.
 */

const SOFTWARE_GROUPS: TopicGroup[] = [
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
    name: "Web & mobile",
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
];

const NETWORKS_SECURITY: TopicGroup = {
  name: "Networks & security",
  topics: [
    "Cybersecurity",
    "Ethical Hacking",
    "Network Security",
    "Cloud Computing",
    "Cryptography",
    "Wireshark",
    "Kali Linux",
    "System Administration",
  ],
};

/** Every branch gets these on top of its own subjects. */
const COMMON_GROUPS: TopicGroup[] = [
  {
    name: "Engineering basics",
    topics: [
      "Engineering Mathematics",
      "Engineering Physics",
      "Engineering Chemistry",
      "Engineering Drawing",
      "Basic Electrical Engineering",
      "Environmental Science",
      "Technical Communication",
    ],
  },
  {
    name: "Career & placements",
    topics: [
      "Placement Prep",
      "Resume Review",
      "Interview Prep",
      "Aptitude & Reasoning",
      "GATE Prep",
      "GRE & Higher Studies",
      "Internships",
      "Hackathons",
      "Open Source",
      "Core Company Prep",
    ],
  },
];

export const BRANCH_TOPICS: Record<string, TopicGroup[]> = {
  CSE: SOFTWARE_GROUPS,
  IT: [...SOFTWARE_GROUPS, NETWORKS_SECURITY],
  ECE: [
    {
      name: "Electronics core",
      topics: [
        "Analog Electronics",
        "Digital Electronics",
        "Electronic Devices & Circuits",
        "Signals & Systems",
        "Control Systems",
        "Network Analysis",
        "Electromagnetic Theory",
      ],
    },
    {
      name: "Communication systems",
      topics: [
        "Analog Communication",
        "Digital Communication",
        "Wireless & Mobile Communication",
        "Antennas & Wave Propagation",
        "Optical Communication",
        "Satellite Communication",
        "Digital Signal Processing",
      ],
    },
    {
      name: "Embedded & VLSI",
      topics: [
        "Microprocessors",
        "Microcontrollers",
        "Embedded C",
        "VLSI Design",
        "Verilog",
        "VHDL",
        "Arduino",
        "Raspberry Pi",
        "IoT",
        "PCB Design",
      ],
    },
    {
      name: "ECE tools",
      topics: ["MATLAB", "Simulink", "Proteus", "Multisim", "Cadence", "Xilinx Vivado", "LTspice"],
    },
  ],
  Electrical: [
    {
      name: "Power & machines",
      topics: [
        "Electrical Machines",
        "Power Systems",
        "Power Electronics",
        "Switchgear & Protection",
        "Transmission & Distribution",
        "High Voltage Engineering",
        "Electric Drives",
        "Renewable Energy",
        "Electrical Estimation",
      ],
    },
    {
      name: "Circuits & control",
      topics: [
        "Network Analysis",
        "Control Systems",
        "Electrical Measurements",
        "Signals & Systems",
        "Analog Electronics",
        "Digital Electronics",
        "Electromagnetic Fields",
      ],
    },
    {
      name: "Automation & electrical tools",
      topics: [
        "MATLAB",
        "Simulink",
        "PLC & SCADA",
        "ETAP",
        "PSpice",
        "AutoCAD Electrical",
        "Industrial Automation",
        "Wiring & Safety",
      ],
    },
  ],
  Mechanical: [
    {
      name: "Thermal & fluids",
      topics: [
        "Thermodynamics",
        "Heat Transfer",
        "Fluid Mechanics",
        "IC Engines",
        "Refrigeration & Air Conditioning",
        "Power Plant Engineering",
        "Turbomachinery",
      ],
    },
    {
      name: "Design & manufacturing",
      topics: [
        "Engineering Mechanics",
        "Strength of Materials",
        "Theory of Machines",
        "Machine Design",
        "Manufacturing Processes",
        "Material Science",
        "Metrology",
        "Welding & Casting",
        "CNC Machining",
      ],
    },
    {
      name: "Industrial & robotics",
      topics: [
        "Industrial Engineering",
        "Operations Research",
        "Robotics",
        "Mechatronics",
        "Supply Chain",
        "Quality Control",
      ],
    },
    {
      name: "CAD & CAE tools",
      topics: ["AutoCAD", "SolidWorks", "CATIA", "Creo", "Fusion 360", "ANSYS", "CFD", "Siemens NX"],
    },
  ],
  Civil: [
    {
      name: "Structures",
      topics: [
        "Structural Analysis",
        "Reinforced Concrete Design",
        "Steel Structures",
        "Strength of Materials",
        "Concrete Technology",
        "Building Materials",
        "Prestressed Concrete",
        "Earthquake Engineering",
      ],
    },
    {
      name: "Geotech, water & transport",
      topics: [
        "Geotechnical Engineering",
        "Soil Mechanics",
        "Fluid Mechanics",
        "Hydrology",
        "Irrigation Engineering",
        "Water Resources",
        "Transportation Engineering",
        "Highway Engineering",
        "Environmental Engineering",
      ],
    },
    {
      name: "Site & project management",
      topics: [
        "Surveying",
        "Total Station & GPS",
        "Estimation & Costing",
        "Quantity Surveying",
        "Construction Management",
        "Project Planning",
        "Site Safety",
      ],
    },
    {
      name: "Civil software",
      topics: ["AutoCAD", "STAAD.Pro", "ETABS", "Revit", "SketchUp", "Primavera", "MS Project", "QGIS"],
    },
  ],
  Chemical: [
    {
      name: "Process core",
      topics: [
        "Process Calculations",
        "Chemical Thermodynamics",
        "Fluid Mechanics",
        "Heat Transfer",
        "Mass Transfer",
        "Chemical Reaction Engineering",
        "Transport Phenomena",
        "Mechanical Operations",
      ],
    },
    {
      name: "Plant & control",
      topics: [
        "Process Control",
        "Process Equipment Design",
        "Plant Design & Economics",
        "Petroleum Refining",
        "Polymer Technology",
        "Safety & Hazard Analysis",
      ],
    },
    {
      name: "Process software",
      topics: ["Aspen Plus", "Aspen HYSYS", "DWSIM", "MATLAB", "AutoCAD P&ID"],
    },
  ],
  Aerospace: [
    {
      name: "Flight core",
      topics: [
        "Aerodynamics",
        "Flight Mechanics",
        "Aircraft Structures",
        "Propulsion",
        "Gas Dynamics",
        "Orbital Mechanics",
        "Avionics",
        "Composite Materials",
      ],
    },
    {
      name: "Aerospace tools",
      topics: ["ANSYS Fluent", "CFD", "CATIA", "XFLR5", "OpenFOAM", "MATLAB"],
    },
  ],
  Automobile: [
    {
      name: "Vehicle core",
      topics: [
        "IC Engines",
        "Vehicle Dynamics",
        "Automotive Chassis",
        "Transmission Systems",
        "Automotive Electronics",
        "EV Technology",
        "Hybrid Vehicles",
        "Automotive Safety",
        "Vehicle Maintenance",
      ],
    },
    {
      name: "Automotive tools",
      topics: ["AutoCAD", "SolidWorks", "CATIA", "ANSYS", "GT-Suite"],
    },
  ],
  Biotech: [
    {
      name: "Life sciences",
      topics: [
        "Biochemistry",
        "Microbiology",
        "Molecular Biology",
        "Genetic Engineering",
        "Cell Biology",
        "Immunology",
        "Enzyme Technology",
      ],
    },
    {
      name: "Bioprocess & biomedical",
      topics: [
        "Bioprocess Engineering",
        "Bioreactor Design",
        "Downstream Processing",
        "Bioinformatics",
        "Biomedical Instrumentation",
        "Biomaterials",
        "Tissue Engineering",
      ],
    },
    {
      name: "Lab & biotech tools",
      topics: ["PCR & Electrophoresis", "BLAST & NCBI Tools", "Python for Bioinformatics", "MATLAB", "SPSS"],
    },
  ],
};

/** Every group once, in branch order — CSE and IT share objects, so identity dedupes them. */
export const ALL_TOPIC_GROUPS: TopicGroup[] = [
  ...new Set(Object.values(BRANCH_TOPICS).flat()),
  ...COMMON_GROUPS,
];

/** Branch subjects first, then the shared ones, minus anything the branch already lists. */
export function topicGroupsFor(branch: string): TopicGroup[] {
  const groups = BRANCH_TOPICS[branch];
  if (!groups) return ALL_TOPIC_GROUPS;

  const claimed = new Set(groups.flatMap((g) => g.topics));
  const shared = COMMON_GROUPS.map((g) => ({
    ...g,
    topics: g.topics.filter((t) => !claimed.has(t)),
  })).filter((g) => g.topics.length > 0);

  return [...groups, ...shared];
}

export const TOPICS = [...new Set(ALL_TOPIC_GROUPS.flatMap((g) => g.topics))];

export const TARGET_COMPANIES = [
  "Amazon",
  "Google",
  "Microsoft",
  "Adobe",
  "Atlassian",
  "Flipkart",
  "Goldman Sachs",
  "Qualcomm",
  "Siemens",
  "Tata Motors",
  "Larsen & Toubro",
];

export const TARGET_JOB_ROLES = [
  "Software Development Engineer (SDE)",
  "Data Scientist",
  "AI Researcher",
  "Backend Engineer",
  "Frontend Engineer",
  "DevOps Engineer",
  "Product Engineer",
  "Product Manager",
  "Machine Learning Engineer",
  "Data Analyst",
  "Full Stack Developer",
  "Embedded Systems Engineer",
  "Electrical Engineer",
  "Mechanical Design Engineer",
  "Structural Engineer",
];

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export const BRANCHES = [
  "CSE",
  "IT",
  "ECE",
  "Electrical",
  "Mechanical",
  "Civil",
  "Chemical",
  "Aerospace",
  "Automobile",
  "Biotech",
  "Other",
];

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

/*
 * Sample profiles. Their company and role lists were entered separately, so
 * they stay unpaired — pairing them would claim "SDE at Amazon" when the data
 * only says "Amazon" and "SDE".
 */
const company = (name: string): MentorExperience => ({
  company: name,
  position: null,
  verification: "self-reported",
});
const position = (name: string): MentorExperience => ({
  company: null,
  position: name,
  verification: "self-reported",
});

const SAMPLE_MENTORS: Mentor[] = [
  {
    id: "aarav",
    name: "Aarav S.",
    year: "3rd Year",
    branch: "CSE",
    rating: 4.9,
    reviews: 32,
    skills: ["Docker", "Git", "Linux"],
    experience: [company("Amazon"), position("Software Development Engineer (SDE)"), position("DevOps Engineer")],
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
    experience: [company("Microsoft"), position("Software Development Engineer (SDE)"), position("Backend Engineer")],
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
    experience: [company("Amazon"), position("AI Researcher")],
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
    experience: [company("Google"), position("Data Scientist"), position("Software Development Engineer (SDE)")],
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
    experience: [company("Atlassian"), position("Frontend Engineer")],
    verified: "medium",
    online: false,
    slots: [
      { day: "Fri", time: "7 PM" },
      { day: "Sat", time: "5 PM" },
    ],
  },
  {
    id: "meera",
    name: "Meera J.",
    year: "4th Year",
    branch: "Civil",
    rating: 4.8,
    reviews: 21,
    skills: ["Structural Analysis", "AutoCAD", "Surveying"],
    experience: [company("Larsen & Toubro"), position("Structural Engineer")],
    verified: "high",
    online: true,
    slots: [
      { day: "Mon", time: "11 AM" },
      { day: "Wed", time: "5 PM" },
      { day: "Sat", time: "10 AM" },
    ],
  },
  {
    id: "vikram",
    name: "Vikram D.",
    year: "3rd Year",
    branch: "Mechanical",
    rating: 4.7,
    reviews: 18,
    skills: ["Thermodynamics", "SolidWorks", "Strength of Materials"],
    experience: [company("Tata Motors"), position("Mechanical Design Engineer")],
    verified: "medium",
    online: false,
    slots: [
      { day: "Tue", time: "4 PM" },
      { day: "Thu", time: "7 PM" },
    ],
  },
  {
    id: "sana",
    name: "Sana P.",
    year: "4th Year",
    branch: "Electrical",
    rating: 4.9,
    reviews: 23,
    skills: ["Electrical Machines", "Power Systems", "MATLAB"],
    experience: [company("Siemens"), position("Electrical Engineer")],
    verified: "high",
    online: true,
    slots: [
      { day: "Mon", time: "6 PM" },
      { day: "Fri", time: "12 PM" },
    ],
  },
  {
    id: "irfan",
    name: "Irfan Q.",
    year: "3rd Year",
    branch: "ECE",
    rating: 4.6,
    reviews: 15,
    skills: ["Embedded C", "Microcontrollers", "VLSI Design"],
    experience: [company("Qualcomm"), position("Embedded Systems Engineer")],
    verified: "medium",
    online: false,
    slots: [
      { day: "Wed", time: "3 PM" },
      { day: "Sun", time: "8 PM" },
    ],
  },
];

export const MENTORS: Mentor[] = SAMPLE_MENTORS.map((mentor) => ({ ...mentor, source: "sample" }));

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
  {
    match: ["beam", "bending", "truss", "moment", "staad", "slab", "column", "load"],
    topic: "Structural Analysis",
    concept: "Load paths & support conditions",
    explanation:
      "The numbers come out wrong because the supports you assumed don't match how the load actually travels to the ground.",
  },
  {
    match: ["thermo", "entropy", "enthalpy", "carnot", "heat transfer", "cycle", "steam"],
    topic: "Thermodynamics",
    concept: "Choosing the system boundary",
    explanation:
      "Most of these questions get easier the moment you fix what's inside the control volume and what crosses it.",
  },
  {
    match: ["motor", "transformer", "torque", "power factor", "alternator", "winding", "load flow"],
    topic: "Electrical Machines",
    concept: "Equivalent circuits & phasor reasoning",
    explanation:
      "The machine isn't behaving oddly — the equivalent circuit you're solving is missing the losses that matter here.",
  },
  {
    match: ["arduino", "microcontroller", "embedded", "interrupt", "uart", "i2c", "gpio", "timer"],
    topic: "Embedded C",
    concept: "Peripheral configuration & timing",
    explanation:
      "The code is fine; the peripheral registers aren't set up for the clock and timing your board actually runs at.",
  },
  {
    match: ["autocad", "solidworks", "catia", "ansys", "cad", "drafting", "assembly", "mesh"],
    topic: "AutoCAD",
    concept: "Constraints & model setup",
    explanation:
      "The model fights you because it's under-constrained — fix the references before touching the geometry.",
  },
];

const DEFAULT_TRIAGE = {
  topic: "",
  concept: "Problem decomposition",
  explanation:
    "Before the solution, the gap is breaking the problem into what you're given, what you're solving for, and the step between them.",
};

function normalizeSkillPhrase(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();
}

function containsSkillPhrase(text: string, phrase: string) {
  const normalizedText = normalizeSkillPhrase(text);
  const normalizedPhrase = normalizeSkillPhrase(phrase);
  return Boolean(normalizedPhrase) && ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
}

/** Explainable browser-side ranking shared by onboarding and Discover. */
function matchMentorsBase(
  { query = "", topics = [], branch = "", verifiedOnly = false, onlineOnly = false }: MatchPreferences,
  mentors: Mentor[],
): MentorMatch[] {
  const normalizedQuery = query.trim().toLowerCase();
  const rule = normalizedQuery
    ? TRIAGE_RULES.find((item) => item.match.some((keyword) => normalizedQuery.includes(keyword)))
    : undefined;
  const queryWords = normalizedQuery.split(/\W+/).filter((word) => word.length > 2);
  const mentorSkills = [...new Set(mentors.flatMap((mentor) => mentor.skills))];
  const inferredTopics = rule?.topic
    ? [rule.topic]
    : mentorSkills.filter((skill) => {
        if (containsSkillPhrase(normalizedQuery, skill)) return true;
        const skillWords = normalizeSkillPhrase(skill).split(/\s+/).filter((word) => word.length > 2);
        return skillWords.some((word) => queryWords.includes(word));
      });
  const requested = normalizedQuery
    ? [...new Set(inferredTopics)]
    : [...new Set(topics)];
  const requestedLower = requested.map((topic) => topic.toLowerCase());

  return mentors.filter((mentor) => !verifiedOnly || mentor.verified !== "claimed")
    .filter((mentor) => !onlineOnly || mentor.online)
    .map((mentor) => {
      const matchedSkills = mentor.skills.filter((skill) => {
        return requestedLower.some((topic) => containsSkillPhrase(skill, topic) || containsSkillPhrase(topic, skill));
      });

      let score = 24;
      score += Math.min(44, matchedSkills.length * 32);
      if (branch && mentor.branch === branch) score += 10;
      if (mentor.verified === "high") score += 10;
      if (mentor.verified === "medium") score += 6;
      score += Math.round(Math.max(0, mentor.rating - 4) * 8);
      if (mentor.online) score += 5;
      if (mentor.reviews >= 20) score += 3;

      const reasons: string[] = [];
      if (matchedSkills.length > 0) reasons.push(`Strong match for ${matchedSkills.join(" and ")}`);
      if (branch && mentor.branch === branch) reasons.push("Same branch context");
      if (mentor.verified === "high") reasons.push("High-confidence SkillProof");
      else if (mentor.verified === "medium") reasons.push("Verified skill evidence");
      if (mentor.online) reasons.push("Available for quick help now");
      if (reasons.length === 0) reasons.push(`${mentor.rating} rated across ${mentor.reviews} sessions`);

      return {
        mentor,
        score: Math.min(99, score),
        matchedSkills,
        reasons: reasons.slice(0, 3),
      };
    })
    .filter((match) => !normalizedQuery || match.matchedSkills.length > 0)
    .sort((a, b) => b.score - a.score || b.mentor.rating - a.mentor.rating);
}

/**
 * Topic ranking plus optional placement goals. With no company or position
 * set this returns exactly the topic ranking; with goals set, mentors are
 * grouped by placement tier (exact → partial → related → none) and the topic
 * score orders mentors inside each tier. See `placement.ts` for the rules.
 */
export function matchMentors(preferences: MatchPreferences, mentors: Mentor[] = MENTORS): MentorMatch[] {
  const baseMatches = matchMentorsBase(preferences, mentors);
  if (!hasPlacementGoals(preferences)) return baseMatches;

  return baseMatches
    .map((match) => {
      const placement = placementFit(match.mentor, preferences);
      return {
        ...match,
        score: Math.min(99, match.score + placement.bonus),
        placement,
        reasons: [placement.explanation, ...match.reasons].slice(0, 3),
      };
    })
    .sort(
      (a, b) =>
        TIER_PRIORITY[b.placement.tier] - TIER_PRIORITY[a.placement.tier] ||
        b.score - a.score ||
        b.mentor.rating - a.mentor.rating,
    );
}

function reasonFor(mentor: Mentor, topic: string) {
  const verified =
    mentor.verified === "claimed" ? "self-claimed" : `${mentor.verified}-confidence verified`;
  const slot = mentor.slots[0];
  return `${verified} in ${topic}, ${mentor.reviews} rated sessions, ${
    mentor.online ? "online right now" : slot ? `next free ${slot.day} ${slot.time}` : "no open slots listed"
  }.`;
}

/** Mock of `POST /api/match` — swap for the Gemini call when the API exists. */
export function runTriage(
  text: string,
  context: {
    branch?: string;
    topics?: string[];
    targetCompanies?: string[];
    targetRoles?: string[];
  } = {},
  mentors: Mentor[] = MENTORS,
): Triage {
  const lower = text.toLowerCase();
  const rule = TRIAGE_RULES.find((r) => r.match.some((k) => lower.includes(k)));
  const fallback = { ...DEFAULT_TRIAGE, topic: context.topics?.[0] ?? "Engineering Mathematics" };
  const { topic, concept, explanation } = rule ?? fallback;

  const ranked = matchMentors({
    query: text,
    topics: [...(context.topics ?? []), topic],
    branch: context.branch,
    targetCompanies: context.targetCompanies,
    targetRoles: context.targetRoles,
  }, mentors).slice(0, 3);

  return {
    topic,
    concept,
    explanation,
    mentors: ranked.map(({ mentor, score, reasons }) => ({
      mentor,
      reason: `${score}% match · ${reasons[0] ?? reasonFor(mentor, topic)}`,
    })),
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
