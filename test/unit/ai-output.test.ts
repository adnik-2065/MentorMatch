import { describe, expect, it } from "vitest";
import { AiOutputError, extractJson, parseAiJson } from "@/lib/ai/json";
import { aiAdaptiveSchema, aiRoadmapSchema, filterChanges, normalizeRoadmap } from "@/lib/roadmap/ai-output";
import { planJson } from "../support/helpers";

describe("extracting JSON from model text", () => {
  it("handles fences and surrounding prose", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! Here it is: {"a":1} Hope that helps')).toEqual({ a: 1 });
  });

  it("rejects text with no object or a truncated one", () => {
    expect(() => extractJson("I can't help with that")).toThrow(AiOutputError);
    expect(() => extractJson('{"title": "Docker", "milestones": [')).toThrow(AiOutputError);
  });
});

describe("roadmap output validation", () => {
  it("accepts a well-formed plan", () => {
    const plan = parseAiJson(planJson(3), aiRoadmapSchema);
    expect(plan.milestones).toHaveLength(3);
    expect(plan.milestones[0].quiz.questions).toHaveLength(3);
  });

  it("is lenient where it's safe: coerces numbers, drops bad links and invalid quiz questions", () => {
    const raw = JSON.parse(planJson(1));
    raw.milestones[0].estimatedHours = "5";
    raw.milestones[0].resources.push({ title: "Evil", type: "video", url: "javascript:alert(1)" });
    raw.milestones[0].resources.push({ nonsense: true });
    raw.milestones[0].quiz.questions.push({ question: "Broken?", options: ["a", "b"], correctIndex: 7 });

    const plan = parseAiJson(JSON.stringify(raw), aiRoadmapSchema);
    const m = plan.milestones[0];
    expect(m.estimatedHours).toBe(5);
    expect(m.resources).toHaveLength(2);
    expect(m.resources[1].url).toBeUndefined();
    expect(m.quiz.questions).toHaveLength(3);
  });

  it("is strict where it matters, and reports why", () => {
    const noValidQuiz = JSON.parse(planJson(1));
    noValidQuiz.milestones[0].quiz.questions = [{ question: "Only bad?", options: ["a"], correctIndex: 3 }];
    const noTasks = JSON.parse(planJson(1));
    noTasks.milestones[0].assignments = [];
    noTasks.milestones[0].exercises = [];

    for (const [raw, reason] of [
      [noValidQuiz, /quiz/],
      [noTasks, /assignment or exercise/],
    ] as const) {
      try {
        parseAiJson(JSON.stringify(raw), aiRoadmapSchema);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AiOutputError);
        expect((error as AiOutputError).issues.join("\n")).toMatch(reason);
      }
    }
  });

  it("rejects a plan with no milestones or missing capstone", () => {
    expect(() => parseAiJson(planJson(1, { milestones: [] }), aiRoadmapSchema)).toThrow(AiOutputError);
    expect(() => parseAiJson(planJson(1, { capstone: undefined }), aiRoadmapSchema)).toThrow(AiOutputError);
  });

  it("makes week ranges contiguous and inside the duration", () => {
    const raw = JSON.parse(planJson(3));
    raw.milestones[0].weekEnd = 2; // overlaps week 2
    raw.milestones[2].weekStart = 9; // past the end
    raw.milestones[2].weekEnd = 12;

    const plan = normalizeRoadmap(parseAiJson(JSON.stringify(raw), aiRoadmapSchema), 6);
    expect(plan.milestones.map((m) => [m.weekStart, m.weekEnd])).toEqual([
      [1, 2],
      [3, 3],
      [4, 6],
    ]);
  });

  it("refuses more milestones than weeks", () => {
    const plan = parseAiJson(planJson(4), aiRoadmapSchema);
    expect(() => normalizeRoadmap(plan, 2)).toThrow(AiOutputError);
  });
});

describe("adaptive output validation", () => {
  it("defaults evidence to limited and only keeps changes to editable milestones", () => {
    const out = aiAdaptiveSchema.parse({
      summary: "Revisit volumes",
      analysis: "You missed both volume questions, which suggests the mount model isn't clear yet.",
      evidence: "certain",
      recommendations: [{ type: "practice", title: "Volume drills", detail: "Mount, write, restart, check." }],
      changes: [],
    });
    expect(out.evidence).toBe("limited");

    const kept = filterChanges(
      [
        { op: "add_task", milestonePosition: 1, kind: "EXERCISE", title: "Done week", description: "x" },
        { op: "add_task", milestonePosition: 2, kind: "EXERCISE", title: "Upcoming week", description: "x" },
        { op: "delete_everything", milestonePosition: 2 },
      ],
      new Set([2, 3]),
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].milestonePosition).toBe(2);
  });
});
