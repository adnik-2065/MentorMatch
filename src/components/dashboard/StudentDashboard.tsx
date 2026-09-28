"use client";

import Link from "next/link";
import { Badge, Card, Stars } from "@/components/ui";
import { DashboardGate, DashboardShell, EmptyState, Section, StatTile } from "./Shell";
import { SessionCard } from "./SessionCard";
import { RateSessionCard } from "./RateSessionCard";
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconDot,
  IconNote,
  IconShield,
  IconSparkle,
  IconTrend,
} from "@/components/icons";
import { studentView, useAccount } from "@/lib/account";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function StudentDashboard() {
  const { ready, account, profile } = useAccount();
  const view = ready && account ? studentView(account, profile) : null;

  if (!view) {
    return (
      <DashboardGate
        ready={ready}
        signedIn={Boolean(account)}
        title={account ? "You haven't set up learning yet" : "Sign in to see your dashboard"}
        body={
          account
            ? "Pick the subjects you want to learn and tell us what you're stuck on — this page fills up with your own sessions, not sample ones."
            : "Your dashboard is built from what you enter in onboarding. You can also open the sample account to see one that's already in use."
        }
        cta={
          account
            ? { href: "/onboarding", label: "Set up learning" }
            : { href: "/signin", label: "Go to sign in" }
        }
      />
    );
  }

  const [next, ...later] = view.sessions;
  const toRate = view.toRate[0];
  const firstName = view.name.split(" ")[0];

  return (
    <DashboardShell
      role="student"
      name={view.name}
      meta={[view.year, view.branch].filter(Boolean).join(" ")}
      demo={view.demo}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-fg sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {next
              ? `Your next session is ${next.day.toLowerCase()} at ${next.time}.`
              : "Nothing booked right now."}
          </p>
        </div>

        <Link
          href="/onboarding"
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
        >
          <IconSparkle />
          Ask a doubt
        </Link>
      </div>

      {toRate && (
        <Section title="Finish this first">
          <RateSessionCard session={toRate} />
        </Section>
      )}

      <Section
        title="Upcoming sessions"
        action={
          view.sessions.length > 0 ? (
            <span className="text-xs text-faint">{view.sessions.length} booked</span>
          ) : undefined
        }
      >
        {view.sessions.length === 0 ? (
          <EmptyState
            title="No sessions booked"
            body="Describe what you're stuck on and we'll route you to a senior who has already solved it."
            action={
              <Link
                href="/onboarding"
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
              >
                Find a mentor
                <IconArrowRight />
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            <SessionCard session={next} perspective="student" featured />
            {later.map((session) => (
              <SessionCard key={session.id} session={session} perspective="student" />
            ))}
          </div>
        )}
      </Section>

      <Section title="Your subjects">
        {view.topics.length === 0 ? (
          <EmptyState
            title="No subjects picked yet"
            body="Your subjects decide which mentors surface first and what shows up in your feed."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {view.topics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Your progress">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Sessions"
            value={String(view.stats.sessionsDone)}
            hint={view.stats.sessionsDone > 0 ? "all rated" : "none yet"}
            icon={<IconCheck className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Hours learnt"
            value={`${view.stats.hoursLearnt}h`}
            hint="since you joined"
            icon={<IconTrend className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Streak"
            value={view.stats.streak > 0 ? `${view.stats.streak} weeks` : "—"}
            hint="at least one session a week"
            icon={<IconCalendar className="h-3.5 w-3.5" />}
          />
        </div>
      </Section>

      <Section
        title="Mentors for your subjects"
        action={<span className="text-xs text-faint">Top rated first</span>}
      >
        <ul className="space-y-3">
          {view.recommended.map((mentor, i) => (
            <li
              key={mentor.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-line bg-surface p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs tabular-nums text-faint">#{i + 1}</span>
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
                  {mentor.year} · {mentor.branch} · {mentor.skills.join(", ")}
                </p>
                <p className="mt-2 text-xs text-faint">
                  Next free {mentor.slots[0].day} {mentor.slots[0].time}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Stars rating={mentor.rating} />
                    <span className="text-sm font-medium tabular-nums text-fg">{mentor.rating}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-faint">{mentor.reviews} sessions</p>
                </div>
                <Link
                  href="/onboarding"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`}
                >
                  Book
                  <IconArrowRight />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Your notes vault">
        {view.recaps.length === 0 ? (
          <EmptyState
            title="No recaps yet"
            body="After each session an AI recap with practice tasks lands here automatically."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {view.recaps.map((recap) => (
              <Card key={recap.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-primary-text">
                    <IconNote className="h-3.5 w-3.5" />
                  </span>
                  <Badge>{recap.topic}</Badge>
                  <span className="text-xs text-faint">{recap.date}</span>
                </div>
                <h3 className="mt-3 text-sm leading-relaxed font-medium text-fg">{recap.title}</h3>
                <p className="mt-3 text-xs text-faint">
                  Practice tasks: {recap.done} of {recap.tasks} done
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={recap.done}
                  aria-valuemin={0}
                  aria-valuemax={recap.tasks}
                  aria-label={`${recap.topic} practice tasks`}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-inset"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(recap.done / recap.tasks) * 100}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        {view.demo
          ? "Sample account — pre-filled so you can see a dashboard that's been in use. Your own account is untouched."
          : "Your account. Sessions, subjects and slots come from what you entered in onboarding; chat and AI recaps arrive with the backend."}
      </p>
    </DashboardShell>
  );
}
