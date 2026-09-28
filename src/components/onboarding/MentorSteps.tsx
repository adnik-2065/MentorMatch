"use client";

import { useState } from "react";
import { Badge, Button, Card, Chip, ChoiceGroup, Input, StepHeading } from "@/components/ui";
import { IconArrowRight, IconCalendar, IconShield, IconSparkle } from "@/components/icons";
import {
  DAYS,
  HOURS,
  TOPICS,
  VIVA,
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

      <ChoiceGroup label="Topics you can mentor in">
        {TOPICS.map((topic) => (
          <Chip
            key={topic}
            label={topic}
            selected={state.teachTopics.includes(topic)}
            onClick={() => toggle(topic)}
          />
        ))}
      </ChoiceGroup>

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

  const analyse = () => {
    patch({ proofStatus: "analysing" });
    // Stands in for POST /api/skillproof — Gemini reads the repos and extracts evidence.
    setTimeout(() => patch({ proofStatus: "done" }), 1800);
  };

  return (
    <div className="space-y-7">
      <StepHeading
        title="SkillProof — prove it with your code"
        subtitle="We read your public repos and pull out what you demonstrably did. No claim, no checkbox."
      />

      <Input
        id="github"
        label="GitHub username"
        hint="Public repositories only. Nothing is stored or cloned."
        value={state.github}
        placeholder="your-github-handle"
        onChange={(e) => patch({ github: e.target.value })}
      />

      {state.proofStatus === "idle" && (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!state.github.trim()} onClick={analyse}>
            Analyse my repos
            <IconArrowRight />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              patch({ proofStatus: "skipped" });
              next();
            }}
          >
            Skip — stay self-claimed
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
              Reading repositories…
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
          <Button onClick={next}>
            Continue to the viva
            <IconArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}

export function VivaStep({
  state,
  patch,
  next,
}: {
  state: OnboardingState;
  patch: Patch;
  next: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  if (state.proofStatus === "skipped") {
    return (
      <div className="space-y-7">
        <StepHeading
          title="Viva skipped"
          subtitle="You stay Self-claimed for now. Connect GitHub any time from your profile to get verified."
        />
        <Button onClick={next}>
          Continue to availability
          <IconArrowRight />
        </Button>
      </div>
    );
  }

  const answer = (qIndex: number, option: number) => {
    const copy = [...state.vivaAnswers];
    copy[qIndex] = option;
    patch({ vivaAnswers: copy });
  };

  const answered = state.vivaAnswers.filter((a) => a !== null).length;
  const correct = state.vivaAnswers.filter((a, i) => a === VIVA[i].answer).length;

  return (
    <div className="space-y-7">
      <StepHeading
        title="Quick viva on your own code"
        subtitle="Generated from what we found in your repos. Not trivia — this is what makes the badge mean something."
      />

      <ol className="space-y-4">
        {VIVA.map((q, qi) => (
          <li key={q.prompt}>
            <Card>
              <div className="flex flex-wrap items-start gap-2.5">
                <Badge>{q.topic}</Badge>
                <p className="max-w-[56ch] flex-1 text-sm leading-relaxed text-fg">{q.prompt}</p>
              </div>
              <div className="mt-4 space-y-2">
                {q.options.map((opt, oi) => {
                  const chosen = state.vivaAnswers[qi] === oi;
                  const showResult = submitted && chosen;
                  const right = oi === q.answer;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      disabled={submitted}
                      onClick={() => answer(qi, oi)}
                      className={`block w-full rounded-lg border px-4 py-3 text-left text-sm leading-relaxed transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                        submitted ? "cursor-default" : "cursor-pointer"
                      } ${
                        showResult
                          ? right
                            ? "border-success bg-success-soft font-medium text-success"
                            : "border-danger bg-danger-soft font-medium text-danger"
                          : chosen
                            ? "border-primary bg-primary-soft font-medium text-primary-text"
                            : "border-line text-muted hover:border-line-strong hover:text-fg"
                      }`}
                    >
                      {showResult && <span aria-hidden="true">{right ? "✓ " : "✕ "}</span>}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </Card>
          </li>
        ))}
      </ol>

      {!submitted ? (
        <div className="flex flex-wrap items-center gap-4">
          <Button disabled={answered < VIVA.length} onClick={() => setSubmitted(true)}>
            Submit answers
          </Button>
          <p aria-live="polite" className="text-xs text-faint">
            {answered} of {VIVA.length} answered
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-success/30 bg-success-soft">
            <p aria-live="polite" className="text-sm font-medium text-success">
              {correct}/{VIVA.length} correct —{" "}
              {correct === VIVA.length
                ? "verified at High confidence."
                : correct >= 2
                  ? "verified at Medium confidence."
                  : "not verified yet. You can retake this in 24 hours."}
            </p>
          </Card>
          <Button onClick={next}>
            Continue to availability
            <IconArrowRight />
          </Button>
        </div>
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
  const toggle = (day: string, hour: string) => {
    const current = state.availability[day] ?? [];
    const updated = current.includes(hour)
      ? current.filter((h) => h !== hour)
      : [...current, hour];
    patch({ availability: { ...state.availability, [day]: updated } });
  };

  const total = Object.values(state.availability).flat().length;

  return (
    <div className="space-y-7">
      <StepHeading
        title="When are you free?"
        subtitle="These become bookable slots. Without them you won't appear in search."
      />

      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] border-separate border-spacing-1.5">
            <caption className="sr-only">
              Weekly availability grid — select the hours you are free
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-16">
                  <span className="sr-only">Time</span>
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d}
                    scope="col"
                    className="pb-1 text-xs font-medium text-faint"
                  >
                    {d}
                  </th>
                ))}
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
                    const on = state.availability[day]?.includes(hour);
                    return (
                      <td key={day}>
                        <button
                          type="button"
                          aria-pressed={on ?? false}
                          aria-label={`${day} ${hour}`}
                          onClick={() => toggle(day, hour)}
                          className={`h-11 w-full cursor-pointer rounded-md border transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
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

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4 text-xs text-faint">
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
            Repeats weekly
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button disabled={total === 0} onClick={next}>
          {total > 0 ? `Publish ${total} slots a week` : "Pick at least one slot"}
          <IconArrowRight />
        </Button>
        <p aria-live="polite" className="text-xs text-faint">
          {total === 0 ? "Select at least one hour" : `${total} hours selected`}
        </p>
      </div>

      <Card className="flex flex-wrap items-center gap-3 bg-inset">
        <span className="text-primary-text">
          <IconSparkle />
        </span>
        <p className="text-sm text-muted">
          Block exam dates later from your calendar — this grid is just the default week.
        </p>
      </Card>
    </div>
  );
}
