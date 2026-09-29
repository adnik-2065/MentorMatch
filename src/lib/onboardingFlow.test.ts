import { describe, expect, it } from "vitest";
import { initialState, type OnboardingState } from "./onboarding";
import { canJump, flowReducer, initialFlow, isStepEmpty, stepErrors, stepsFor, type FlowState } from "./onboardingFlow";

const student: OnboardingState = {
  ...initialState,
  role: "junior",
  name: "Asha",
  college: "IIT Test",
  year: "2nd Year",
  branch: "CSE",
  learnTopics: ["DSA"],
};

const keyAt = (flow: FlowState, state: OnboardingState) => stepsFor(state.role)[flow.index].key;

describe("student steps", () => {
  it("are ordered and keep placement goals and blocker optional", () => {
    const steps = stepsFor("junior");
    expect(steps.map((s) => s.key)).toEqual(["role", "profile", "learn", "goals", "stuck", "match", "done"]);
    expect(steps.filter((s) => s.optional).map((s) => s.key)).toEqual(["goals", "stuck"]);
  });
});

describe("flowReducer", () => {
  it("blocks Continue with inline errors until the step is valid", () => {
    const state = { ...student, name: "", branch: "" };
    const flow = { index: 1, furthest: 1, showErrors: false };
    const blocked = flowReducer(flow, { type: "next", state });
    expect(blocked).toEqual({ ...flow, showErrors: true });
    expect(Object.keys(stepErrors("profile", state)).sort()).toEqual(["branch", "name"]);
    expect(flowReducer(blocked, { type: "next", state: student })).toEqual({ index: 2, furthest: 2, showErrors: false });
  });

  it("walks forward and back without touching form values", () => {
    let flow = initialFlow;
    for (let i = 0; i < 3; i++) flow = flowReducer(flow, { type: "next", state: student });
    expect(keyAt(flow, student)).toBe("goals");
    flow = flowReducer(flow, { type: "back" });
    flow = flowReducer(flow, { type: "back" });
    expect(keyAt(flow, student)).toBe("profile");
    expect(flow.furthest).toBe(3);
    // Values live outside the reducer, so going back can't lose them.
    expect(canJump(flow, 3, student)).toBe(true);
    expect(flowReducer(flow, { type: "jump", index: 3, state: student }).index).toBe(3);
  });

  it("only skips optional steps that are still empty", () => {
    const atGoals: FlowState = { index: 3, furthest: 3, showErrors: false };
    expect(isStepEmpty("goals", student)).toBe(true);
    expect(flowReducer(atGoals, { type: "skip", state: student }).index).toBe(4);

    const withGoal = { ...student, targetCompanies: ["Amazon"] };
    expect(flowReducer(atGoals, { type: "skip", state: withGoal })).toBe(atGoals);

    const atLearn: FlowState = { index: 2, furthest: 2, showErrors: false };
    expect(flowReducer(atLearn, { type: "skip", state: student })).toBe(atLearn);
  });

  it("validates the optional blocker only when something was typed", () => {
    expect(stepErrors("stuck", student)).toEqual({});
    expect(stepErrors("stuck", { ...student, stuckOn: "docker" }).stuckOn).toBeTruthy();
  });

  it("rejects placement goals over the limit", () => {
    const many = Array.from({ length: 11 }, (_, i) => `Co ${i}`);
    expect(stepErrors("goals", { ...student, targetCompanies: many }).targetCompanies).toBeTruthy();
  });

  it("does not let the rail skip past incomplete or unvisited steps", () => {
    const flow: FlowState = { index: 1, furthest: 4, showErrors: false };
    expect(canJump(flow, 5, student)).toBe(false);
    expect(canJump(flow, 3, { ...student, learnTopics: [] })).toBe(false);
  });

  it("starts a fresh path when the role changes", () => {
    const flow: FlowState = { index: 0, furthest: 5, showErrors: false };
    const mentor = { ...student, role: "mentor" as const };
    expect(flowReducer(flow, { type: "next", state: mentor })).toEqual({ index: 1, furthest: 1, showErrors: false });
  });
});
