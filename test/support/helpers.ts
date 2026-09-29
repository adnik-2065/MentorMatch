import { NextRequest } from "next/server";
import type { AiProvider, JsonRequest } from "@/lib/ai/provider";
import { db } from "@/lib/server/db";
import { generateRoadmap } from "@/lib/roadmap/generate";
import type { Preference } from "@/lib/roadmap/schemas";
import { createPreference } from "@/lib/roadmap/service";

export const hasDb = Boolean(process.env.TEST_DATABASE_URL);

/** Empties every app table between tests. */
export async function resetDb() {
  const tables = await db().$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await db().$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  }
}

let counter = 0;
export async function makeUser(overrides: { isMentor?: boolean; name?: string; teachTopics?: string[] } = {}) {
  counter += 1;
  return db().user.create({
    data: {
      email: `student${counter}-${Date.now()}@college.ac.in`,
      name: overrides.name ?? `Student ${counter}`,
      isMentor: overrides.isMentor ?? false,
      teachTopics: overrides.teachTopics ?? [],
    },
  });
}

/** A scripted stand-in for the LLM. Each call consumes the next response. */
export function fakeProvider(responses: (string | Error)[]) {
  const calls: JsonRequest[] = [];
  const provider: AiProvider & { calls: JsonRequest[] } = {
    name: "fake",
    model: "fake-model",
    calls,
    async generateJson(request) {
      calls.push(request);
      const next = responses.shift();
      if (next === undefined) throw new Error("fakeProvider ran out of responses");
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return provider;
}

export const validPreference: Preference = {
  skill: "Docker",
  currentLevel: "BEGINNER",
  targetLevel: "INTERMEDIATE",
  goal: "Containerise my final-year project and understand what compose actually does.",
  timeAmount: 6,
  timeUnit: "WEEK",
  durationWeeks: 3,
  learningStyle: "PROJECTS",
  focusTopics: ["Volumes", "Compose networking"],
};

/** What a well-behaved model returns for `validPreference` — test fixture only. */
export function planJson(weeks = 3, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    title: "Docker from first container to compose",
    description: "Go from running single containers to shipping a multi-service app with compose.",
    estimatedDuration: `${weeks} weeks`,
    weeklyCommitment: "About 6 hours a week",
    milestones: Array.from({ length: weeks }, (_, i) => ({
      weekStart: i + 1,
      weekEnd: i + 1,
      title: `Week ${i + 1} milestone`,
      summary: `By the end of week ${i + 1} you can explain and use the ideas covered.`,
      objectives: [`Objective ${i + 1}a`, `Objective ${i + 1}b`],
      topics: [{ name: `Topic ${i + 1}`, subtopics: ["Part one", "Part two"] }],
      assignments: [{ title: `Build thing ${i + 1}`, description: "Build and push it." }],
      exercises: [{ title: `Exercise ${i + 1}`, description: "Solve the practice set." }],
      resources: [{ title: "Docker docs", type: "documentation", url: "https://docs.docker.com/" }],
      estimatedHours: 6,
      completionCriteria: ["Can explain the concept to a peer"],
      quiz: {
        questions: [
          { question: "Which command lists containers?", options: ["docker ps", "docker ls", "docker show", "docker get"], correctIndex: 0, explanation: "ps lists running containers." },
          { question: "What does -d do?", options: ["Delete", "Detach", "Debug", "Deploy"], correctIndex: 1, explanation: "Runs detached." },
          { question: "Where are named volumes stored?", options: ["In the image", "Managed by Docker", "In /tmp", "Nowhere"], correctIndex: 1, explanation: "Docker manages them." },
        ],
      },
    })),
    capstone: {
      title: "Ship a compose app",
      description: "Containerise a two-service app with a database and a volume.",
      deliverables: ["docker-compose.yml", "README"],
      skillsDemonstrated: ["Multi-stage builds", "Compose networking"],
      successCriteria: ["App starts with one command"],
    },
    ...overrides,
  });
}

export async function createRoadmapFor(userId: string, weeks = 3) {
  const pref = await createPreference(userId, { ...validPreference, durationWeeks: weeks });
  const provider = fakeProvider([planJson(weeks)]);
  const roadmap = await generateRoadmap(userId, pref.id, { provider });
  return { roadmap, pref, provider };
}

/** Builds a request the way a browser on the same origin would send it. */
export function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { host: "localhost:3000", "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });
