"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Badge, Button, Card, StepHeading } from "@/components/ui";
import { IconArrowRight, IconCalendar, IconCheck, IconShield } from "@/components/icons";
import { analyseRepos, type OnboardingState } from "@/lib/onboarding";
import { saveProfile } from "@/lib/account";

export function CompleteStep({ state, onReset }: { state: OnboardingState; onReset: () => void }) {
  const isMentor = state.role === "mentor";

  // Reaching this step is what creates the account — the dashboards read it from here.
  useEffect(() => {
    saveProfile(state);
  }, [state]);

  const firstName = state.name.trim().split(" ")[0] || "there";
  const slotCount = Object.values(state.availability).flat().length;
  const badges = state.proofStatus === "done" ? analyseRepos(state.teachTopics) : [];

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-3">
        <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-surface">
          <IconCheck className="h-5 w-5" />
        </span>
        <StepHeading
          title={`You're set up, ${firstName}`}
          subtitle={
            isMentor
              ? "You're listed and bookable. The first request usually arrives the same day."
              : "That's it — you leave onboarding with a session, not an empty dashboard."
          }
        />
      </div>

      {!isMentor && state.booking && (
        <Card className="border-success/30 bg-success-soft">
          <Badge tone="success">
            <IconCalendar className="h-3 w-3" />
            Session booked
          </Badge>
          <p className="mt-3 font-sans text-xl font-semibold text-fg">
            {state.booking.day}, {state.booking.time} · {state.booking.mentor.name}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {state.triage?.topic ?? state.learnTopics[0]} — {state.triage?.concept}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            The session room opens at slot time. You&apos;ll get a reminder 15 minutes before.
          </p>
        </Card>
      )}

      {!isMentor && !state.booking && (
        <Card className="bg-inset">
          <p className="text-sm font-medium text-fg">No session booked yet.</p>
          <p className="mt-1 text-sm text-muted">
            Head to Discover and pick a slot whenever you&apos;re ready.
          </p>
        </Card>
      )}

      {isMentor && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Your skills</h3>
            <ul className="mt-3.5 space-y-2.5">
              {state.teachTopics.map((topic) => {
                const badge = badges.find((b) => b.topic === topic);
                return (
                  <li key={topic} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-fg">{topic}</span>
                    {badge ? (
                      <Badge tone={badge.confidence === "High" ? "success" : "warning"}>
                        <IconShield className="h-3 w-3" />
                        {badge.confidence}
                      </Badge>
                    ) : (
                      <Badge>Self-claimed</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h3 className="text-xs font-medium tracking-wide text-faint uppercase">
              Your availability
            </h3>
            <p className="mt-3 font-sans text-3xl font-semibold tabular-nums text-fg">
              {slotCount}
            </p>
            <p className="text-sm text-muted">bookable slots per week</p>
            <p className="mt-3 text-xs leading-relaxed text-faint">
              {Object.entries(state.availability)
                .filter(([, hours]) => hours.length > 0)
                .map(([day, hours]) => `${day} ${hours.length}h`)
                .join(" · ") || "None published"}
            </p>
          </Card>
        </div>
      )}

      <Card className="bg-inset">
        <h3 className="text-xs font-medium tracking-wide text-faint uppercase">
          What happens next
        </h3>
        <ul className="mt-3.5 space-y-2.5 text-sm leading-relaxed text-muted">
          {(isMentor
            ? [
                "Juniors searching your topics now see you, sorted by rating.",
                "You get pinged for Instant Help while you're marked online.",
                "After 3 sessions, you can train your Mentor Twin.",
              ]
            : [
                "Your session room opens at slot time — everything happens in chat.",
                "You'll rate the session afterwards; that unlocks your next booking.",
                "An AI recap with practice tasks lands in your notes vault.",
              ]
          ).map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <span className="mt-1 text-primary-text">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
              {line}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={isMentor ? "/mentor" : "/dashboard"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Go to dashboard
          <IconArrowRight />
        </Link>
        <Button variant="ghost" onClick={onReset}>
          Restart demo
        </Button>
      </div>
    </div>
  );
}
