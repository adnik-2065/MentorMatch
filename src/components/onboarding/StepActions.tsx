"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";
import type { OnboardingState } from "@/lib/onboarding";

/** What each step gets from the onboarding shell. */
export type StepNav = {
  /** Validates the current step; optional patch is applied first (e.g. picking a role). */
  next: (patch?: Partial<OnboardingState>) => void;
  back: () => void;
  /** Only present while the current step is optional and still empty. */
  skip?: () => void;
  /** Visible inline errors — empty until the user has tried to continue. */
  errors: Record<string, string>;
};

/**
 * The footer every student step shares: Back on the left, Skip and the
 * primary action on the right. On narrow screens the primary action stacks
 * first so it's the easiest thing to reach.
 */
export function StepActions({
  onBack,
  onSkip,
  skipLabel = "Skip for now",
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
  busy,
  errorCount = 0,
  extra,
}: {
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  onContinue: () => void;
  continueLabel?: ReactNode;
  continueDisabled?: boolean;
  busy?: boolean;
  errorCount?: number;
  extra?: ReactNode;
}) {
  return (
    <div className="space-y-4 border-t border-line pt-6">
      {errorCount > 0 && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {errorCount === 1 ? "One field needs attention" : `${errorCount} fields need attention`} before you continue.
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            <IconArrowLeft />
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {extra}
          {onSkip && (
            <Button variant="outline" onClick={onSkip}>
              {skipLabel}
            </Button>
          )}
          <Button onClick={onContinue} disabled={continueDisabled || busy}>
            {continueLabel}
            {!busy && <IconArrowRight />}
          </Button>
        </div>
      </div>
    </div>
  );
}
