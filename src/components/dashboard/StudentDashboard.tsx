"use client";

import Link from "next/link";
import { Badge, Stars } from "@/components/ui";
import { DashboardGate, DashboardShell, EmptyState, Section, StatTile } from "./Shell";
import { SessionCard } from "./SessionCard";
import { RateSessionCard } from "./RateSessionCard";
import { RecapVault, type RecapSource } from "./Recaps";
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconDot,
  IconHelp,
  IconMessage,
  IconShield,
  IconSparkle,
  IconTrend,
} from "@/components/icons";
import { studentView, useAccount } from "@/lib/account";
import { acceptBooking, cancelBooking } from "@/lib/bookings";
import { askedLabel, removeDoubt } from "@/lib/doubts";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function StudentDashboard() {
  const { ready, account, profile, bookings, doubts, recaps, refresh } = useAccount();
  const view = ready && account ? studentView(account, profile, bookings, recaps) : null;

  if (!view || !account) {
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
  const unread = view.sessions.reduce((n, s) => n + s.unread, 0);
  const awaiting = view.sessions.filter((s) => s.status === "pending").length;

  // Rooms that are over and have nothing written up yet. A doubt counts: it has
  // a room and a concept, which is everything the recap needs.
  const written = new Set(recaps.map((r) => r.sessionId));
  const recapSources: RecapSource[] = [
    ...[...view.toRate, ...view.sessions.filter((s) => s.status === "completed")].map((s) => ({
      id: s.id,
      topic: s.topic,
      concept: s.concept,
      label: `Session with ${s.with}`,
    })),
    ...doubts.map((d) => ({
      id: d.id,
      topic: d.topic,
      concept: d.concept,
      label: `Doubt you asked about ${d.topic}`,
    })),
  ].filter((s) => !written.has(s.id));

  // Only sessions you booked yourself can be cancelled from here.
  const cancel = (id: string) =>
    bookings.some((b) => b.id === id) && account
      ? () => {
          cancelBooking(account, id);
          refresh();
        }
      : undefined;

  /**
   * Nobody can accept for real yet, so your own account would sit on "pending"
   * forever. This is the stand-in — the sample account doesn't get it, because
   * there you *are* the mentor and the request is waiting in your own inbox.
   */
  const accept = (id: string) =>
    account === "me" && bookings.some((b) => b.id === id)
      ? () => {
          acceptBooking(account, id);
          refresh();
        }
      : undefined;

  return (
    <DashboardShell
      role="student"
      name={view.name}
      meta={[view.year, view.branch].filter(Boolean).join(" ")}
      demo={view.demo}
      unread={unread}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-fg sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {next
              ? next.status === "pending"
                ? `You've asked ${next.with.split(" ")[0]} for ${next.day.toLowerCase()} at ${next.time} — waiting on them to accept.`
                : `Your next session is ${next.day.toLowerCase()} at ${next.time}.`
              : "Nothing booked right now."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/ask"
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`}
          >
            <IconHelp />
            Ask a doubt
          </Link>
          <Link
            href="/book"
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
          >
            <IconSparkle />
            Book a session
          </Link>
        </div>
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
            <span className="text-xs text-faint">
              {awaiting > 0
                ? `${view.sessions.length - awaiting} confirmed · ${awaiting} awaiting`
                : `${view.sessions.length} booked`}
            </span>
          ) : undefined
        }
      >
        {view.sessions.length === 0 ? (
          <EmptyState
            title="No sessions booked"
            body="Describe what you're stuck on and we'll route you to a senior who has already solved it."
            action={
              <Link
                href="/book"
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
              >
                Find a mentor
                <IconArrowRight />
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            <SessionCard
              session={next}
              perspective="student"
              featured
              onCancel={cancel(next.id)}
              onAccept={accept(next.id)}
            />
            {later.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                perspective="student"
                onCancel={cancel(session.id)}
                onAccept={accept(session.id)}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Doubts you've asked"
        action={
          doubts.length > 0 ? (
            <Link
              href="/ask"
              className={`rounded text-xs font-medium text-primary-text underline underline-offset-4 ${focus}`}
            >
              Ask another
            </Link>
          ) : undefined
        }
      >
        {doubts.length === 0 ? (
          <EmptyState
            title="Nothing asked yet"
            body="Some questions don't need 45 minutes. Post one and any senior who claims the subject can answer it."
            action={
              <Link
                href="/ask"
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
              >
                Ask a doubt
                <IconArrowRight />
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {doubts.map((doubt) => (
              <li
                key={doubt.id}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 rounded-xl border border-line bg-surface p-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{doubt.topic}</Badge>
                    {doubt.concept && (
                      <span className="text-xs text-faint">Gap: {doubt.concept}</span>
                    )}
                    <span className="text-xs text-faint">{askedLabel(doubt.at)}</span>
                  </div>
                  <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-fg">{doubt.text}</p>
                  {/* Nobody can answer until the backend routes it, so don't imply anyone has. */}
                  <p className="mt-2 text-xs text-faint">
                    Waiting for a senior to pick it up. No slot is being held.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/chat?s=${doubt.id}`}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`}
                  >
                    <IconMessage className="h-3.5 w-3.5" />
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (!account) return;
                      removeDoubt(account, doubt.id);
                      refresh();
                    }}
                    className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm text-faint transition-colors duration-200 hover:bg-inset hover:text-fg ${focus}`}
                  >
                    Withdraw
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
                  href={`/book?mentor=${mentor.id}`}
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
        <RecapVault
          account={account}
          recaps={view.recaps}
          sources={recapSources}
          refresh={refresh}
        />
      </Section>

      <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        {view.demo
          ? "Sample account — pre-filled so you can see a dashboard that's been in use. Your own account is untouched."
          : "Your account. Subjects and sessions come from onboarding and whatever you book; message history is saved in this browser until the backend lands."}
      </p>
    </DashboardShell>
  );
}
