"use client";

import { IconCheck } from "@/components/icons";

export type RailStep = { key: string; label: string; hint: string; optional?: boolean };

export function ProgressRail({
  steps,
  current,
  canJump,
  onJump,
  role,
}: {
  steps: RailStep[];
  current: number;
  canJump: (index: number) => boolean;
  onJump: (index: number) => void;
  role: "junior" | "mentor" | null;
}) {
  const pct = Math.round((current / Math.max(1, steps.length - 1)) * 100);
  const timing =
    role === "mentor"
      ? "Around 4 minutes · evidence is optional"
      : role === "junior"
        ? "Around 2 minutes · optional steps can be skipped"
        : "A focused setup, tailored to your goal";

  return (
    <aside className="lg:sticky lg:top-8 lg:h-fit lg:w-72 lg:shrink-0">
      <div className="rounded-3xl bg-nav p-6 text-white shadow-[0_20px_55px_rgb(23_24_43/0.16)]">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-sans text-lg font-semibold text-white">Create your workspace</h1>
          <span className="text-xs tabular-nums text-nav-muted">
            {Math.min(current + 1, steps.length)}/{steps.length}
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding progress"
          aria-valuetext={`Step ${Math.min(current + 1, steps.length)} of ${steps.length}: ${steps[current]?.label ?? ""}`}
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-nav-muted">{timing}</p>

        {/* Phones get the current step only — the full list would push the form below the fold. */}
        <p className="mt-4 text-sm font-semibold text-white lg:hidden">
          {steps[current]?.label}
          {steps[current]?.optional && <span className="ml-2 text-xs font-normal text-nav-muted">Optional</span>}
        </p>

        <ol className="mt-6 hidden space-y-1 lg:block">
          {steps.map((step, index) => {
            const state = index < current ? "done" : index === current ? "active" : "todo";
            const reachable = index !== current && canJump(index);
            return (
              <li key={step.key}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && onJump(index)}
                  aria-current={state === "active" ? "step" : undefined}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    state === "active"
                      ? "bg-white/10"
                      : reachable
                        ? "cursor-pointer hover:bg-white/[0.07]"
                        : "cursor-default"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums ${
                      state === "done"
                        ? "border-success bg-success text-white"
                        : state === "active"
                          ? "border-primary bg-primary text-on-primary"
                          : "border-white/20 text-nav-muted"
                    }`}
                  >
                    {state === "done" ? <IconCheck className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm ${state === "active" ? "font-semibold text-white" : "text-nav-muted"}`}>
                      {step.label}
                      {step.optional && <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-nav-muted">Optional</span>}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-nav-muted">{step.hint}</span>
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
