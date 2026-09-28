"use client";

import { IconCheck } from "@/components/icons";

export type RailStep = {
  key: string;
  label: string;
  hint: string;
};

export function ProgressRail({
  steps,
  current,
  onJump,
  role,
}: {
  steps: RailStep[];
  current: number;
  onJump: (index: number) => void;
  role: "junior" | "mentor" | null;
}) {
  const pct = Math.round((current / steps.length) * 100);

  const timing =
    role === "mentor"
      ? "About 10 minutes. Verification is skippable."
      : role === "junior"
        ? "About 2 minutes. You'll finish with a booked session."
        : "About 2 minutes to start.";

  return (
    <aside className="lg:sticky lg:top-10 lg:h-fit lg:w-72 lg:shrink-0">
      <div className="rounded-xl border border-line bg-surface p-5 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-sans text-lg font-semibold text-fg">Get set up</h1>
          <span className="text-sm tabular-nums text-muted">
            Step {Math.min(current + 1, steps.length)} of {steps.length}
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding progress"
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-inset"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-faint">{timing}</p>

        <ol className="mt-5 space-y-1">
          {steps.map((step, i) => {
            const state = i < current ? "done" : i === current ? "active" : "todo";
            const reachable = i <= current;
            return (
              <li key={step.key}>
                <button
                  type="button"
                  disabled={!reachable}
                  aria-current={state === "active" ? "step" : undefined}
                  onClick={() => onJump(i)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                    state === "active"
                      ? "bg-primary-soft"
                      : reachable
                        ? "cursor-pointer hover:bg-inset"
                        : "cursor-default"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums ${
                      state === "done"
                        ? "border-success bg-success text-surface"
                        : state === "active"
                          ? "border-primary text-primary-text"
                          : "border-line text-faint"
                    }`}
                  >
                    {state === "done" ? <IconCheck className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm ${
                        state === "todo" ? "text-faint" : "font-medium text-fg"
                      }`}
                    >
                      {step.label}
                      {state === "done" && <span className="sr-only"> — completed</span>}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-faint">
                      {step.hint}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
