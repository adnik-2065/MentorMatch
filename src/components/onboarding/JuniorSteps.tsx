"use client";

import { useState } from "react";
import { Badge, Button, Card, Chip, ChoiceGroup, Stars, StepHeading, Textarea } from "@/components/ui";
import { IconArrowRight, IconDot, IconShield, IconSparkle } from "@/components/icons";
import { TOPICS, runTriage, type Mentor, type OnboardingState } from "@/lib/onboarding";

type Patch = (patch: Partial<OnboardingState>) => void;

export function LearnTopicsStep({
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
      learnTopics: state.learnTopics.includes(topic)
        ? state.learnTopics.filter((t) => t !== topic)
        : [...state.learnTopics, topic],
    });

  return (
    <div className="space-y-7">
      <StepHeading
        title="What do you want to learn?"
        subtitle="Pick a few. This drives your feed and the mentors we surface first."
      />

      <ChoiceGroup label="Topics" hint="Tap to select. You can change these any time.">
        {TOPICS.map((topic) => (
          <Chip
            key={topic}
            label={topic}
            selected={state.learnTopics.includes(topic)}
            onClick={() => toggle(topic)}
          />
        ))}
      </ChoiceGroup>

      <div className="flex flex-wrap items-center gap-4">
        <Button disabled={state.learnTopics.length === 0} onClick={next}>
          Continue
          {state.learnTopics.length > 0 && ` with ${state.learnTopics.length}`}
          <IconArrowRight />
        </Button>
        <p aria-live="polite" className="text-xs text-faint">
          {state.learnTopics.length === 0
            ? "Select at least one topic"
            : `${state.learnTopics.length} selected`}
        </p>
      </div>
    </div>
  );
}

export function StuckStep({
  state,
  patch,
  next,
}: {
  state: OnboardingState;
  patch: Patch;
  next: () => void;
}) {
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    // Stands in for POST /api/match — Gemini reads the text and returns the concept gap.
    setTimeout(() => {
      patch({ triage: runTriage(state.stuckOn) });
      setRunning(false);
      next();
    }, 1400);
  };

  return (
    <div className="space-y-7">
      <StepHeading
        title="What are you stuck on right now?"
        subtitle="Paste an error or just describe it. This is the part that actually finds you a mentor."
      />

      <Textarea
        id="stuck"
        label="Your problem"
        hint="Example: my docker container exits immediately and my code changes never show up"
        rows={5}
        value={state.stuckOn}
        placeholder="Describe it the way you'd say it out loud…"
        onChange={(e) => patch({ stuckOn: e.target.value })}
      />

      <Card className="border-primary/25 bg-primary-soft/50">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-primary-text">
            <IconSparkle />
          </span>
          <p className="text-sm leading-relaxed text-muted">
            We read this to find the <span className="font-medium text-fg">underlying concept
            gap</span> — not just keywords. A &ldquo;React bug&rdquo; that&apos;s really a closure
            misunderstanding gets routed accordingly.
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={state.stuckOn.trim().length < 10 || running} onClick={run}>
          {running ? (
            <>
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"
              />
              Reading your problem…
            </>
          ) : (
            <>
              Find me a mentor
              <IconArrowRight />
            </>
          )}
        </Button>
        <Button variant="ghost" onClick={next}>
          Skip for now
        </Button>
        <span aria-live="polite" className="sr-only">
          {running ? "Analysing your problem" : ""}
        </span>
      </div>
    </div>
  );
}

function MentorCard({
  mentor,
  reason,
  rank,
  booking,
  onPick,
}: {
  mentor: Mentor;
  reason: string;
  rank: number;
  booking: OnboardingState["booking"];
  onPick: (day: string, time: string) => void;
}) {
  const isBooked = booking?.mentor.id === mentor.id;

  return (
    <li
      className={`rounded-xl border p-5 transition-colors duration-200 ${
        isBooked ? "border-primary bg-primary-soft/40" : "border-line bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs tabular-nums text-faint">#{rank}</span>
            <span className="font-sans font-semibold text-fg">{mentor.name}</span>
            {mentor.verified !== "claimed" && (
              <Badge tone="success">
                <IconShield className="h-3 w-3" />
                Verified
              </Badge>
            )}
            {mentor.online && (
              <Badge tone="primary">
                <IconDot className="h-1.5 w-1.5" />
                Online
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-faint">
            {mentor.year} · {mentor.branch}
          </p>
          <p className="mt-2.5 max-w-[52ch] text-sm leading-relaxed text-muted">{reason}</p>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Stars rating={mentor.rating} />
            <span className="text-sm font-medium tabular-nums text-fg">{mentor.rating}</span>
          </div>
          <p className="mt-0.5 text-xs text-faint">{mentor.reviews} sessions</p>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-xs font-medium text-faint">Open slots</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {mentor.slots.map((slot) => {
            const selected =
              isBooked && booking?.day === slot.day && booking?.time === slot.time;
            return (
              <button
                key={`${slot.day}-${slot.time}`}
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(slot.day, slot.time)}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-3.5 text-sm transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                  selected
                    ? "border-primary bg-primary font-medium text-on-primary"
                    : "border-line bg-surface text-muted hover:border-primary hover:text-fg"
                }`}
              >
                {slot.day} {slot.time}
              </button>
            );
          })}
        </div>
      </div>
    </li>
  );
}

export function MatchStep({
  state,
  patch,
  next,
}: {
  state: OnboardingState;
  patch: Patch;
  next: () => void;
}) {
  const triage = state.triage;

  if (!triage) {
    return (
      <div className="space-y-7">
        <StepHeading
          title="No problem described yet"
          subtitle="Go back a step and tell us what you're stuck on — or browse mentors from your dashboard."
        />
        <Button onClick={next}>Finish setup</Button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <StepHeading
        title="Here's who can help"
        subtitle="Top rated for your topic, free soonest. Book one and you're done."
      />

      <Card className="border-primary/25 bg-primary-soft/50">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            <IconSparkle className="h-3 w-3" />
            Concept gap
          </Badge>
          <span className="font-sans font-semibold text-fg">{triage.concept}</span>
          <Badge>{triage.topic}</Badge>
        </div>
        <p className="mt-2.5 max-w-[60ch] text-sm leading-relaxed text-muted">
          {triage.explanation}
        </p>
      </Card>

      <ul className="space-y-3">
        {triage.mentors.map(({ mentor, reason }, i) => (
          <MentorCard
            key={mentor.id}
            mentor={mentor}
            reason={reason}
            rank={i + 1}
            booking={state.booking}
            onPick={(day, time) => patch({ booking: { mentor, day, time } })}
          />
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!state.booking} onClick={next}>
          {state.booking
            ? `Book ${state.booking.day} ${state.booking.time}`
            : "Pick a slot to continue"}
          <IconArrowRight />
        </Button>
        <Button variant="ghost" onClick={next}>
          I&apos;ll book later
        </Button>
      </div>
    </div>
  );
}
