"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { ProgressRail } from "./ProgressRail";
import { ProfileStep, RoleStep } from "./SharedSteps";
import { LearnTopicsStep, MatchStep, PlacementGoalsStep, StuckStep } from "./JuniorSteps";
import { AvailabilityStep, SkillProofStep, TeachTopicsStep } from "./MentorSteps";
import { CompleteStep } from "./CompleteStep";
import type { StepNav } from "./StepActions";
import { IconArrowLeft } from "@/components/icons";
import { initialState, type OnboardingState } from "@/lib/onboarding";
import {
  canJump,
  flowReducer,
  initialFlow,
  isStepEmpty,
  stepErrors,
  stepsFor,
} from "@/lib/onboardingFlow";
import { fetchOwnProfile, loadProfile, normalizeStoredProfile } from "@/lib/account";

export function OnboardingDashboard() {
  const [state, setState] = useState<OnboardingState>(initialState);
  const [flow, dispatch] = useReducer(flowReducer, initialFlow);
  const contentRef = useRef<HTMLDivElement>(null);
  const shownIndex = useRef(flow.index);

  useEffect(() => {
    const saved = loadProfile();
    if (saved) {
      setState(saved);
      return;
    }
    // No browser copy — fall back to the server copy tied to this browser's owner cookie.
    let cancelled = false;
    fetchOwnProfile().then((remote) => {
      if (cancelled || !remote) return;
      const { id: _id, updatedAt: _updatedAt, ...profile } = remote as Partial<OnboardingState> & {
        id?: string;
        updatedAt?: string;
      };
      setState((current) => (current === initialState ? normalizeStoredProfile(profile) : current));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = stepsFor(state.role);
  const index = Math.min(flow.index, steps.length - 1);
  const step = steps[index];
  const key = step.key;

  // Move focus to the new step's heading so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (shownIndex.current === flow.index) return;
    shownIndex.current = flow.index;
    contentRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [flow.index]);

  // After a failed Continue, put focus on the first field that needs fixing.
  useEffect(() => {
    if (flow.showErrors) contentRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [flow.showErrors]);

  const patch = (p: Partial<OnboardingState>) => setState((s) => ({ ...s, ...p }));

  const nav: StepNav = {
    next: (p) => {
      if (p) patch(p);
      dispatch({ type: "next", state: p ? { ...state, ...p } : state });
    },
    back: () => dispatch({ type: "back" }),
    skip: step.optional && isStepEmpty(key, state) ? () => dispatch({ type: "skip", state }) : undefined,
    errors: flow.showErrors ? stepErrors(key, state) : {},
  };
  const next = () => nav.next();

  const reset = () => {
    setState(initialState);
    dispatch({ type: "reset" });
  };

  const body = () => {
    switch (key) {
      case "role":
        return <RoleStep state={state} nav={nav} />;
      case "profile":
        return <ProfileStep state={state} patch={patch} nav={nav} />;
      case "learn":
        return <LearnTopicsStep state={state} patch={patch} nav={nav} />;
      case "goals":
        return <PlacementGoalsStep state={state} patch={patch} nav={nav} />;
      case "stuck":
        return <StuckStep state={state} patch={patch} nav={nav} />;
      case "match":
        return <MatchStep state={state} patch={patch} nav={nav} />;
      case "teach":
        return <TeachTopicsStep state={state} patch={patch} next={next} />;
      case "proof":
        return <SkillProofStep state={state} patch={patch} next={next} />;
      case "slots":
        return <AvailabilityStep state={state} patch={patch} next={next} />;
      case "done":
        return <CompleteStep state={state} onReset={reset} />;
    }
  };

  // Student and shared steps carry their own Back button; mentor steps keep the original one.
  const legacyBack = key === "teach" || key === "proof" || key === "slots";

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
          <a href="/" className="font-sans text-base font-semibold text-fg">MentorMatch</a>
          <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-text">No verification required · prototype mode</span>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10 lg:flex-row lg:gap-12">
        <ProgressRail
          steps={steps}
          current={index}
          canJump={(target) => canJump(flow, target, state)}
          onJump={(target) => dispatch({ type: "jump", index: target, state })}
          role={state.role}
        />

        <main className="min-w-0 flex-1 rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_70px_rgb(23_26_43/0.07)] sm:p-9 lg:p-11">
          <p aria-live="polite" className="sr-only">
            Step {index + 1} of {steps.length}: {step.label}
            {step.optional ? " (optional)" : ""}
          </p>

          {/* key forces a remount per step so the fade re-runs on navigation */}
          <div ref={contentRef} key={key} className="motion-safe:animate-[fadeIn_220ms_ease-out]">
            {body()}
          </div>

          {legacyBack && (
            <button
              type="button"
              onClick={nav.back}
              className="mt-9 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors duration-200 outline-none hover:bg-inset hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <IconArrowLeft />
              Back
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
