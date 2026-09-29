/**
 * Onboarding navigation as a pure reducer. The form values live in
 * `OnboardingState` and are never touched here — moving between steps only
 * changes which step is shown, so going back and forward preserves input.
 */

import type { OnboardingState, Role } from "./onboarding";
import { LIMITS, validatePlacementSeason } from "./profileValidation";

export type StepKey =
  | "role"
  | "profile"
  | "learn"
  | "goals"
  | "stuck"
  | "match"
  | "teach"
  | "proof"
  | "slots"
  | "done";

export type StepDef = { key: StepKey; label: string; hint: string; optional?: boolean };

export const SHARED_STEPS: StepDef[] = [
  { key: "role", label: "Choose your path", hint: "Learn or start mentoring" },
  { key: "profile", label: "About you", hint: "Name, college, year and branch" },
];

export const JUNIOR_STEPS: StepDef[] = [
  { key: "learn", label: "Subjects", hint: "What you want help with" },
  { key: "goals", label: "Placement goals", hint: "Companies and positions", optional: true },
  { key: "stuck", label: "Current blocker", hint: "What you're stuck on", optional: true },
  { key: "match", label: "Suggested mentors", hint: "Compare and request a session" },
  { key: "done", label: "All set", hint: "Your workspace is ready" },
];

export const MENTOR_STEPS: StepDef[] = [
  { key: "teach", label: "Teaching profile", hint: "Topics and experience" },
  { key: "proof", label: "Build trust", hint: "Add optional skill evidence" },
  { key: "slots", label: "Set availability", hint: "Publish your weekly hours" },
  { key: "done", label: "You're live", hint: "Your mentor page is ready" },
];

export function stepsFor(role: Role | null): StepDef[] {
  return [...SHARED_STEPS, ...(role === "mentor" ? MENTOR_STEPS : role === "junior" ? JUNIOR_STEPS : [])];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inline messages for the fields a step requires. Empty object = step is complete. */
export function stepErrors(key: StepKey, state: OnboardingState): Record<string, string> {
  const errors: Record<string, string> = {};
  switch (key) {
    case "role":
      if (!state.role) errors.role = "Choose how you want to start.";
      break;
    case "profile":
      if (!state.name.trim()) errors.name = "Enter your name.";
      if (!state.college.trim()) errors.college = "Enter your college.";
      if (state.email.trim() && !EMAIL_PATTERN.test(state.email.trim())) {
        errors.email = "Enter a valid email address, or leave this blank.";
      }
      if (!state.year) errors.year = "Choose your year.";
      if (!state.branch) errors.branch = "Choose your branch.";
      break;
    case "learn":
      if (state.learnTopics.length === 0) errors.learnTopics = "Pick at least one subject so we can find the right seniors.";
      break;
    case "goals": {
      if (state.targetCompanies.length > LIMITS.targets) {
        errors.targetCompanies = `Add at most ${LIMITS.targets} companies.`;
      }
      if (state.targetRoles.length > LIMITS.targets) errors.targetRoles = `Add at most ${LIMITS.targets} positions.`;
      const season = validatePlacementSeason(state.placementSeason);
      if (season) errors.placementSeason = season;
      break;
    }
    case "stuck":
      if (state.stuckOn.trim() && state.stuckOn.trim().length < 10) {
        errors.stuckOn = "Add a little more detail (at least 10 characters), or skip this step.";
      }
      break;
  }
  return errors;
}

/** Optional steps offer "Skip" only while they're empty, so skipping never discards input. */
export function isStepEmpty(key: StepKey, state: OnboardingState) {
  if (key === "goals") {
    return state.targetCompanies.length === 0 && state.targetRoles.length === 0 && !state.placementSeason.trim();
  }
  if (key === "stuck") return !state.stuckOn.trim();
  return false;
}

/* ---------------------------------- reducer --------------------------------- */

export type FlowState = {
  index: number;
  /** Furthest step reached on this path — the rail lets you jump back up to here. */
  furthest: number;
  /** Set after a failed Continue so errors appear only once the user has tried. */
  showErrors: boolean;
};

export const initialFlow: FlowState = { index: 0, furthest: 0, showErrors: false };

export type FlowAction =
  | { type: "next"; state: OnboardingState }
  | { type: "skip"; state: OnboardingState }
  | { type: "back" }
  | { type: "jump"; index: number; state: OnboardingState }
  | { type: "reset" };

/** A step can be opened from the rail if it was reached before and nothing before it is incomplete. */
export function canJump(flow: FlowState, target: number, state: OnboardingState) {
  const steps = stepsFor(state.role);
  if (target < 0 || target >= steps.length || target > flow.furthest) return false;
  return steps.slice(0, target).every((step) => Object.keys(stepErrors(step.key, state)).length === 0);
}

function advance(flow: FlowState, state: OnboardingState): FlowState {
  const steps = stepsFor(state.role);
  const index = Math.min(flow.index + 1, steps.length - 1);
  // Leaving the role step starts a fresh path — the old one's progress doesn't apply.
  const furthest = steps[flow.index]?.key === "role" ? index : Math.max(flow.furthest, index);
  return { index, furthest, showErrors: false };
}

export function flowReducer(flow: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "next": {
      const step = stepsFor(action.state.role)[flow.index];
      if (step && Object.keys(stepErrors(step.key, action.state)).length > 0) return { ...flow, showErrors: true };
      return advance(flow, action.state);
    }
    case "skip": {
      const step = stepsFor(action.state.role)[flow.index];
      if (!step?.optional || !isStepEmpty(step.key, action.state)) return flow;
      return advance(flow, action.state);
    }
    case "back":
      return { ...flow, index: Math.max(0, flow.index - 1), showErrors: false };
    case "jump":
      return canJump(flow, action.index, action.state) ? { ...flow, index: action.index, showErrors: false } : flow;
    case "reset":
      return initialFlow;
  }
}
