"use client";

import { useMemo, useState } from "react";
import { ProgressRail, type RailStep } from "./ProgressRail";
import { ProfileStep, RoleStep, VerifyStep } from "./SharedSteps";
import { LearnTopicsStep, MatchStep, StuckStep } from "./JuniorSteps";
import { AvailabilityStep, SkillProofStep, TeachTopicsStep } from "./MentorSteps";
import { CompleteStep } from "./CompleteStep";
import { IconArrowLeft } from "@/components/icons";
import { initialState, type OnboardingState } from "@/lib/onboarding";

const SHARED: RailStep[] = [
  { key: "verify", label: "Verify email", hint: "College address + code" },
  { key: "profile", label: "Your details", hint: "Year, branch, college" },
  { key: "role", label: "Pick a path", hint: "Learn, mentor, or both" },
];

const JUNIOR: RailStep[] = [
  { key: "learn", label: "Topics", hint: "What you want to learn" },
  { key: "stuck", label: "Your problem", hint: "AI finds the concept gap" },
  { key: "match", label: "Book a session", hint: "Top rated, free soonest" },
  { key: "done", label: "Done", hint: "You're booked" },
];

const MENTOR: RailStep[] = [
  { key: "teach", label: "Topics", hint: "What you can teach" },
  { key: "proof", label: "SkillProof", hint: "Add GitHub" },
  { key: "slots", label: "Availability", hint: "10 AM – 10 PM slots" },
  { key: "done", label: "Done", hint: "You're bookable" },
];

export function OnboardingDashboard() {
  const [state, setState] = useState<OnboardingState>(initialState);
  const [step, setStep] = useState(0);

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
      case "verify":
        return <VerifyStep state={state} patch={patch} next={next} />;
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-6 sm:py-12 lg:flex-row lg:gap-14">
        <ProgressRail
          steps={steps}
          current={Math.min(step, steps.length - 1)}
          onJump={setStep}
          role={state.role}
        />

        <main className="min-w-0 flex-1 pb-4">
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
