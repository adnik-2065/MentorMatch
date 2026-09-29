"use client";

import { useEffect, useMemo, useState } from "react";
import { ProgressRail, type RailStep } from "./ProgressRail";
import { ProfileStep, RoleStep } from "./SharedSteps";
import { LearnTopicsStep, MatchStep, StuckStep } from "./JuniorSteps";
import { AvailabilityStep, SkillProofStep, TeachTopicsStep } from "./MentorSteps";
import { CompleteStep } from "./CompleteStep";
import { IconArrowLeft } from "@/components/icons";
import { initialState, type OnboardingState } from "@/lib/onboarding";
import { loadProfile } from "@/lib/account";

const SHARED: RailStep[] = [
  { key: "role", label: "Choose your path", hint: "Learn or start mentoring" },
  { key: "profile", label: "Build your profile", hint: "College, year and branch" },
];

const JUNIOR: RailStep[] = [
  { key: "learn", label: "Learning goals", hint: "Choose subjects and skills" },
  { key: "stuck", label: "Add context", hint: "Describe your current blocker" },
  { key: "match", label: "Meet your matches", hint: "Compare and book a senior" },
  { key: "done", label: "You're ready", hint: "Your workspace is prepared" },
];

const MENTOR: RailStep[] = [
  { key: "teach", label: "Teaching profile", hint: "Choose your strongest topics" },
  { key: "proof", label: "Build trust", hint: "Add optional skill evidence" },
  { key: "slots", label: "Set availability", hint: "Publish your weekly hours" },
  { key: "done", label: "You're live", hint: "Your mentor page is ready" },
];

export function OnboardingDashboard() {
  const [state, setState] = useState<OnboardingState>(initialState);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const saved = loadProfile();
    if (saved) setState(saved);
  }, []);

  const patch = (p: Partial<OnboardingState>) => setState((s) => ({ ...s, ...p }));
  const next = () => setStep((s) => s + 1);

  const steps = useMemo(
    () => [...SHARED, ...(state.role === "mentor" ? MENTOR : state.role === "junior" ? JUNIOR : [])],
    [state.role],
  );

  const reset = () => {
    setState(initialState);
    setStep(0);
  };

  const key = steps[step]?.key ?? "verify";

  const body = () => {
    switch (key) {
      case "profile":
        return <ProfileStep state={state} patch={patch} next={next} />;
      case "role":
        return <RoleStep patch={patch} next={next} />;
      case "learn":
        return <LearnTopicsStep state={state} patch={patch} next={next} />;
      case "stuck":
        return <StuckStep state={state} patch={patch} next={next} />;
      case "match":
        return <MatchStep state={state} patch={patch} next={next} />;
      case "teach":
        return <TeachTopicsStep state={state} patch={patch} next={next} />;
      case "proof":
        return <SkillProofStep state={state} patch={patch} next={next} />;
      case "slots":
        return <AvailabilityStep state={state} patch={patch} next={next} />;
      case "done":
        return <CompleteStep state={state} onReset={reset} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="font-sans text-base font-semibold text-fg">MentorMatch</a>
          <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-text">No verification required · prototype mode</span>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-7 sm:px-8 sm:py-10 lg:flex-row lg:gap-12">
        <ProgressRail
          steps={steps}
          current={Math.min(step, steps.length - 1)}
          onJump={setStep}
          role={state.role}
        />

        <main className="min-w-0 flex-1 rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_70px_rgb(23_26_43/0.07)] sm:p-9 lg:p-11">
          {/* key forces a remount per step so the fade re-runs on navigation */}
          <div key={key} className="motion-safe:animate-[fadeIn_220ms_ease-out]">
            {body()}
          </div>

          {step > 0 && key !== "done" && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
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
