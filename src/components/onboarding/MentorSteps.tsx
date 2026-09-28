"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Input, StepHeading } from "@/components/ui";
import { TopicPicker } from "./TopicPicker";
import {
  IconArrowRight,
  IconCalendar,
  IconGithub,
  IconShield,
  IconSparkle,
} from "@/components/icons";
import {
  AVAILABILITY_PRESETS,
  DAYS,
  HOURS,
  analyseRepos,
  type OnboardingState,
} from "@/lib/onboarding";

type Patch = (patch: Partial<OnboardingState>) => void;

export function TeachTopicsStep({
  state,
  patch,
  next,
}: {
  state: OnboardingState;
  patch: Patch;
  next: () => void;
}) {
  const toggle = (topic: string) =>
    patch({
      teachTopics: state.teachTopics.includes(topic)
        ? state.teachTopics.filter((t) => t !== topic)
        : [...state.teachTopics, topic],
    });

  return (
    <div className="space-y-7">
      <StepHeading
        title="What can you teach?"
        subtitle="Claim anything you've actually built with. The next step is where you prove it."
      />

      <TopicPicker
        label="Subjects you can mentor in"
        hint="Your branch first. Switch to all branches, or type a subject we've missed."
        branch={state.branch}
        selected={state.teachTopics}
        onToggle={toggle}
      />

      <Card className="bg-inset">
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted">
          Unverified claims show as <span className="font-medium text-fg">Self-claimed</span> and
          rank below verified mentors in search. That&apos;s the only penalty — nothing is blocked.
        </p>
      </Card>

      <Button disabled={state.teachTopics.length === 0} onClick={next}>
        Continue
        <IconArrowRight />
      </Button>
    </div>
  );
}

export function SkillProofStep({
  state,
  patch,
  next,
}: {
  state: OnboardingState;
  patch: Patch;
  next: () => void;
}) {
  const findings = state.proofStatus === "done" ? analyseRepos(state.teachTopics) : [];
  // Core branches often have nothing on GitHub — say so instead of making skipping feel like failure.
  const codeBranch = ["CSE", "IT", "ECE"].includes(state.branch);

  const analyse = () => {
    patch({ proofStatus: "analysing" });
    // Stands in for POST /api/skillproof — Gemini reads the repos and extracts evidence.
    setTimeout(() => patch({ proofStatus: "done" }), 1800);
  };

  return (
    <div className="space-y-7">
      <StepHeading
        title="Add GitHub"
        subtitle={
          codeBranch
            ? "We read your public repos and pull out what you demonstrably did — that's what turns a claim into a verified badge."
            : "Optional for your branch. If you have code on GitHub we'll verify it — otherwise skip, and your badge comes from rated sessions instead."
        }
      />

      {state.proofStatus === "skipped" ? (
        <>
          <Card className="bg-inset">
            <Badge>Skipped</Badge>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Your topics stay <span className="font-medium text-fg">Self-claimed</span>. You can
              connect GitHub any time from your profile.
            </p>
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={next}>
              Continue
              <IconArrowRight />
            </Button>
            <Button variant="outline" onClick={() => patch({ proofStatus: "idle" })}>
              <IconGithub />
              Add GitHub instead
            </Button>
          </div>
        </>
      ) : (
        <>
          <Input
            id="github"
            label="GitHub username"
            hint="Public repositories only. Nothing is stored or cloned."
            value={state.github}
            disabled={state.proofStatus !== "idle"}
            placeholder="your-github-handle"
            onChange={(e) => patch({ github: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && state.github.trim() && state.proofStatus === "idle") {
                analyse();
              }
            }}
          />

          {state.proofStatus === "idle" && (
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!state.github.trim()} onClick={analyse}>
                <IconGithub />
                Analyse my repos
              </Button>
              <Button variant="ghost" onClick={() => patch({ proofStatus: "skipped" })}>
                Skip for now
              </Button>
            </div>
          )}

          {state.proofStatus === "analysing" && (
            <Card className="border-primary/25 bg-primary-soft/50">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary"
                />
                <p aria-live="polite" className="text-sm font-medium text-fg">
                  Reading {state.github}&apos;s repositories…
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-faint">
                Dockerfiles, dependency manifests, commit history, branching patterns.
              </p>
            </Card>
          )}

          {state.proofStatus === "done" && (
            <div className="space-y-3">
              <p aria-live="polite" className="text-sm font-medium text-fg">
                Evidence found in {findings.length} topics
              </p>
              {findings.map((f) => (
                <Card key={f.topic}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-sans font-semibold text-fg">{f.topic}</span>
                    <Badge tone={f.confidence === "High" ? "success" : "warning"}>
                      <IconShield className="h-3 w-3" />
                      Verified · {f.confidence}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-faint">{f.evidence}</p>
                </Card>
              ))}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button onClick={next}>
                  Continue
                  <IconArrowRight />
                </Button>
                <Button variant="ghost" onClick={() => patch({ proofStatus: "idle" })}>
                  Use a different account
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function AvailabilityStep({
  state,
  patch,
  next,
}: {
  state: OnboardingState;
  patch: Patch;
  next: () => void;
}) {
  // Drag-to-paint, mouse only — touch keeps tap-per-cell so the grid can still scroll.
  const drag = useRef<{ active: boolean; turnOn: boolean }>({ active: false, turnOn: true });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const stop = () => {
      drag.current.active = false;
      setDragging(false);
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const isOn = (day: string, hour: string) => state.availability[day]?.includes(hour) ?? false;

  const set = (day: string, hour: string, on: boolean) => {
    const current = state.availability[day] ?? [];
    if (on === current.includes(hour)) return;
    patch({
      availability: {
        ...state.availability,
        [day]: on ? [...current, hour] : current.filter((h) => h !== hour),
      },
    });
  };

  const toggleDay = (day: string) => {
    const current = state.availability[day] ?? [];
    const full = current.length === HOURS.length;
    patch({ availability: { ...state.availability, [day]: full ? [] : [...HOURS] } });
  };

  const applyPreset = (preset: (typeof AVAILABILITY_PRESETS)[number]) => {
    const updated = { ...state.availability };
    for (const day of preset.days) {
      const current = new Set(updated[day] ?? []);
      preset.hours.forEach((h) => current.add(h));
      updated[day] = HOURS.filter((h) => current.has(h));
    }
    patch({ availability: updated });
  };

  const clearAll = () => patch({ availability: {} });

  const total = Object.values(state.availability).flat().length;
  const summary = DAYS.filter((d) => (state.availability[d]?.length ?? 0) > 0)
    .map((d) => `${d} ${state.availability[d].length}h`)
    .join(" · ");

  return (
    <div className="space-y-7">
      <StepHeading
        title="When are you free?"
        subtitle="Each block is a one-hour slot between 10 AM and 10 PM. These become bookable — without them you won't appear in search."
      />

      {/* Presets first: most people never touch the grid. */}
      <div className="space-y-2.5">
        <p className="text-sm font-medium text-fg">Quick fill</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-muted transition-colors duration-200 outline-none hover:border-primary hover:bg-primary-soft hover:text-primary-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <IconCalendar className="h-3.5 w-3.5" />
              {preset.label}
            </button>
          ))}
          {total > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm text-faint transition-colors duration-200 outline-none hover:bg-inset hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <p className="mb-3 text-xs text-faint">
          Tap a block to toggle, drag to paint a range, or click a day to select the whole column.
        </p>

        <div className="overflow-x-auto">
          <table
            className={`w-full min-w-[520px] border-separate border-spacing-1 ${
              dragging ? "select-none" : ""
            }`}
          >
            <caption className="sr-only">
              Weekly availability — one-hour slots from 10 AM to 10 PM. Select the hours you are
              free.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-16">
                  <span className="sr-only">Time</span>
                </th>
                {DAYS.map((day) => {
                  const count = state.availability[day]?.length ?? 0;
                  return (
                    <th key={day} scope="col" className="pb-1.5">
                      <button
                        type="button"
                        onClick={() => toggleDay(day)}
                        aria-label={`Select all hours on ${day}`}
                        className="w-full cursor-pointer rounded-md py-1 text-xs font-medium text-muted transition-colors duration-200 outline-none hover:bg-inset hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {day}
                        <span
                          className={`mt-0.5 block text-[10px] tabular-nums ${
                            count > 0 ? "text-primary-text" : "text-faint"
                          }`}
                        >
                          {count > 0 ? `${count}h` : "—"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour}>
                  <th
                    scope="row"
                    className="pr-2 text-right text-xs font-normal whitespace-nowrap text-faint"
                  >
                    {hour}
                  </th>
                  {DAYS.map((day) => {
                    const on = isOn(day, hour);
                    return (
                      <td key={day}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={`${day} ${hour}`}
                          onPointerDown={(e) => {
                            if (e.pointerType === "mouse") {
                              drag.current = { active: true, turnOn: !on };
                              setDragging(true);
                            }
                          }}
                          onPointerEnter={() => {
                            if (drag.current.active) set(day, hour, drag.current.turnOn);
                          }}
                          onClick={() => set(day, hour, !on)}
                          className={`h-9 w-full cursor-pointer rounded-md border transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:h-10 ${
                            on
                              ? "border-primary bg-primary"
                              : "border-line bg-inset hover:border-primary hover:bg-primary-soft"
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs text-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-primary bg-primary" aria-hidden="true" />
            Free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-line bg-inset" aria-hidden="true" />
            Unavailable
          </span>
          <span className="flex items-center gap-1.5">
            <IconCalendar className="h-3.5 w-3.5" />
            Repeats every week
          </span>
        </div>
      </div>

      {total > 0 && (
        <Card className="bg-inset">
          <p aria-live="polite" className="text-sm text-fg">
            <span className="font-semibold tabular-nums">{total}</span> bookable hours a week
          </p>
          <p className="mt-1 text-xs leading-relaxed text-faint">{summary}</p>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button disabled={total === 0} onClick={next}>
          {total > 0 ? `Publish ${total} slots a week` : "Pick at least one slot"}
          <IconArrowRight />
        </Button>
        {total === 0 && <p className="text-xs text-faint">Try a quick fill above</p>}
      </div>

      <Card className="flex flex-wrap items-center gap-3 bg-inset">
        <span className="text-primary-text">
          <IconSparkle />
        </span>
        <p className="text-sm text-muted">
          Block exam dates later from your calendar — this grid is just your default week.
        </p>
      </Card>
    </div>
  );
}
