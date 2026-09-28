"use client";

import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { DashboardGate, DashboardShell, EmptyState, Section, StatTile } from "./Shell";
import { SessionCard } from "./SessionCard";
import { RequestInbox } from "./RequestInbox";
import { OnlineToggle } from "./OnlineToggle";
import {
  IconArrowRight,
  IconCalendar,
  IconClock,
  IconMessage,
  IconShield,
  IconStar,
  IconTrend,
  IconUsers,
} from "@/components/icons";
import { mentorView, useAccount } from "@/lib/account";
import { DAYS } from "@/lib/onboarding";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function MentorDashboard() {
  const { ready, account, profile } = useAccount();
  const view = ready && account ? mentorView(account, profile) : null;

  if (!view) {
    return (
      <DashboardGate
        ready={ready}
        signedIn={Boolean(account)}
        title={account ? "You haven't set up mentoring yet" : "Sign in to see your dashboard"}
        body={
          account
            ? "Claim the subjects you can teach and publish a few slots. Juniors searching those subjects will start seeing you the same day."
            : "Your dashboard is built from what you enter in onboarding. You can also open the sample account to see one that's already in use."
        }
        cta={
          account
            ? { href: "/onboarding", label: "Set up mentoring" }
            : { href: "/signin", label: "Go to sign in" }
        }
      />
    );
  }

  const [next, ...later] = view.sessions;
  const firstName = view.name.split(" ")[0];
  const peak = Math.max(1, ...Object.values(view.week));
  const pending = view.requests.length;

  return (
    <DashboardShell
      role="mentor"
      name={view.name}
      meta={[view.year, view.branch].filter(Boolean).join(" ")}
      demo={view.demo}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-fg sm:text-3xl">
            {pending > 0
              ? `${pending} juniors are waiting on you, ${firstName}`
              : `You're live, ${firstName}`}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {next
              ? `Next session ${next.day.toLowerCase()} at ${next.time} with ${next.with}`
              : view.weeklyHours > 0
                ? `${view.weeklyHours} bookable hours published. Nothing booked yet.`
                : "No slots published — juniors can't book you until you add some."}
          </p>
        </div>

        <Link
          href="/onboarding"
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`}
        >
          <IconCalendar />
          Edit availability
        </Link>
      </div>

      <div className="mt-6">
        <OnlineToggle />
      </div>

      <Section title="Your standing">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="MentorScore"
            value={view.stats.mentorScore !== null ? String(view.stats.mentorScore) : "—"}
            hint={view.stats.mentorScore !== null ? "confidence-weighted" : "after your first session"}
            icon={<IconTrend className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Rating"
            value={view.stats.rating !== null ? view.stats.rating.toFixed(1) : "—"}
            hint={view.stats.reviews > 0 ? `${view.stats.reviews} rated sessions` : "no ratings yet"}
            icon={<IconStar className="h-3.5 w-3.5" filled={false} />}
          />
          <StatTile
            label="Sessions held"
            value={String(view.stats.sessionsHeld)}
            hint="all time"
            icon={<IconUsers className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Response time"
            value={view.stats.responseTime ?? "—"}
            hint="median, last 30 days"
            icon={<IconClock className="h-3.5 w-3.5" />}
          />
        </div>
      </Section>

      <Section
        title="Session requests"
        action={
          pending > 0 ? (
            <span className="text-xs text-faint">Accepting opens the chat immediately</span>
          ) : undefined
        }
      >
        {pending === 0 ? (
          <EmptyState
            title="No requests yet"
            body="Juniors searching your subjects see you sorted by rating. The first request usually arrives the same day."
          />
        ) : (
          <RequestInbox requests={view.requests} />
        )}
      </Section>

      <Section title="Your schedule">
        {view.sessions.length === 0 ? (
          <EmptyState
            title="Nothing booked yet"
            body={
              view.weeklyHours > 0
                ? "Your slots are published and searchable. Bookings land here as they come in."
                : "Publish a few slots between 10 AM and 10 PM — mentors with open evenings get booked first."
            }
            action={
              view.weeklyHours === 0 ? (
                <Link
                  href="/onboarding"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
                >
                  Add slots
                  <IconArrowRight />
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            <SessionCard session={next} perspective="mentor" featured />
            {later.map((session) => (
              <SessionCard key={session.id} session={session} perspective="mentor" />
            ))}
          </div>
        )}
      </Section>

      <div className="mt-10 grid gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="font-sans text-base font-semibold text-fg">Your week</h2>
          <p className="mt-1 text-xs text-faint">
            {view.weeklyHours} bookable hours
            {view.busiestDay ? ` · busiest on ${view.busiestDay}` : ""}
          </p>

          {/* Bar height alone would rely on shape, so each day keeps its number too. */}
          <div className="mt-5 flex items-end justify-between gap-2">
            {DAYS.map((day) => {
              const hours = view.week[day] ?? 0;
              return (
                <div key={day} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs tabular-nums text-faint">{hours}</span>
                  <div
                    className={`w-full rounded-t-md ${hours > 0 ? "bg-primary" : "bg-inset"}`}
                    style={{ height: `${Math.max((hours / peak) * 64, 4)}px` }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-muted">{day}</span>
                </div>
              );
            })}
          </div>

          <Link
            href="/onboarding"
            className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors duration-200 hover:bg-inset hover:text-fg ${focus}`}
          >
            {view.weeklyHours > 0 ? "Add more slots" : "Publish your slots"}
            <IconArrowRight />
          </Link>
        </Card>

        <Card>
          <h2 className="font-sans text-base font-semibold text-fg">Your subjects</h2>
          <p className="mt-1 text-xs text-faint">
            Verified badges rank above self-claimed ones in search.
          </p>

          {view.skills.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              You haven&apos;t claimed any subjects yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {view.skills.map((skill) => (
                <li key={skill.topic} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-fg">{skill.topic}</span>
                  {skill.confidence ? (
                    <Badge tone={skill.confidence === "High" ? "success" : "warning"}>
                      <IconShield className="h-3 w-3" />
                      Verified · {skill.confidence}
                    </Badge>
                  ) : (
                    <Badge>Self-claimed</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-faint">
            {view.stats.profileViews > 0
              ? `${view.stats.profileViews} juniors viewed your profile this week.`
              : "Profile views show up once juniors start finding you in search."}
          </p>
        </Card>
      </div>

      <Section
        title="Open doubts in your subjects"
        action={
          view.doubts.length > 0 ? (
            <span className="text-xs text-faint">No booking needed</span>
          ) : undefined
        }
      >
        {view.doubts.length === 0 ? (
          <EmptyState
            title="Nothing open right now"
            body="Unanswered doubts in the subjects you claimed appear here — answer straight from chat, no slot needed."
          />
        ) : (
          <ul className="space-y-3">
            {view.doubts.map((doubt) => (
              <li className="rounded-xl border border-line bg-surface p-5" key={doubt.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-sans text-sm font-semibold text-fg">{doubt.from}</span>
                  <span className="text-xs text-faint">{doubt.year}</span>
                  <Badge>{doubt.topic}</Badge>
                  <span className="ml-auto text-xs text-faint">
                    {doubt.asked} · {doubt.answers === 0 ? "unanswered" : `${doubt.answers} answered`}
                  </span>
                </div>

                <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted">{doubt.text}</p>

                <button
                  type="button"
                  className={`mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`}
                >
                  <IconMessage />
                  Answer in chat
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        {view.demo
          ? "Sample account — pre-filled so you can see a dashboard that's been in use. Your own account is untouched."
          : "Your account. Subjects and slots come from what you entered in onboarding; requests and sessions arrive once the backend is live."}
      </p>
    </DashboardShell>
  );
}
