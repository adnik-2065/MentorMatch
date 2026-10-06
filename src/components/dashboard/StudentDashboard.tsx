"use client";

import Link from "next/link";
import { Badge, Button, Card, Stars } from "@/components/ui";
import { DashboardGate, DashboardShell, EmptyState, Section, StatTile } from "./Shell";
import { SessionCard } from "./SessionCard";
import { RateSessionCard } from "./RateSessionCard";
import { RecapVault, type RecapSource } from "./Recaps";
import { ActivityChart, ProgressRing } from "./ActivityChart";
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconDot,
  IconHelp,
  IconMessage,
  IconNote,
  IconShield,
  IconSparkle,
  IconTrend,
  IconUsers,
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
        title={account ? "Set up your learning workspace" : "Sign in to open your workspace"}
        body={account ? "Choose what you want to learn and add one current blocker. We'll build the dashboard around it." : "Use your own local profile or open the sample student account."}
        cta={account ? { href: "/onboarding", label: "Set up learning" } : { href: "/signin", label: "Go to sign in" }}
      />
    );
  }

  const [next, ...later] = view.sessions;
  const toRate = view.toRate[0];
  const firstName = view.name.split(" ")[0];
  const unread = view.sessions.reduce((count, session) => count + session.unread, 0);
  const awaiting = view.sessions.filter((session) => session.status === "pending").length;
  const written = new Set(recaps.map((recap) => recap.sessionId));
  const recapSources: RecapSource[] = [
    ...[...view.toRate, ...view.sessions.filter((session) => session.status === "completed")].map((session) => ({
      id: session.id,
      topic: session.topic,
      concept: session.concept,
      label: `Session with ${session.with}`,
    })),
    ...doubts.map((doubt) => ({
      id: doubt.id,
      topic: doubt.topic,
      concept: doubt.concept,
      label: `Doubt you asked about ${doubt.topic}`,
    })),
  ].filter((source) => !written.has(source.id));
  const cancel = (id: string) =>
    bookings.some((booking) => booking.id === id)
      ? () => {
          cancelBooking(account, id);
          refresh();
        }
      : undefined;
  const accept = (id: string) =>
    account === "me" && bookings.some((booking) => booking.id === id)
      ? () => {
          acceptBooking(account, id);
          refresh();
        }
      : undefined;

  return (
    <DashboardShell role="student" name={view.name} meta={[view.year, view.branch].filter(Boolean).join(" · ")} demo={view.demo} unread={unread}>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-text">Overview</p>
          <h1 className="mt-1.5 font-sans text-3xl font-semibold tracking-tight text-fg sm:text-[34px]">Good morning, {firstName}</h1>
          <p className="mt-2 text-sm text-muted">Here&apos;s what&apos;s happening with your learning this week.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ask" className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-inset ${focus}`}>
            <IconHelp /> Ask a doubt
          </Link>
          <Link href="/book" className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary shadow-[0_8px_22px_rgb(var(--primary-shadow)/0.22)] transition-all hover:-translate-y-0.5 hover:bg-primary-hover ${focus}`}>
            <IconSparkle /> Book a session <IconArrowRight />
          </Link>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Sessions completed" value={String(view.stats.sessionsDone)} hint="Lifetime learning sessions" icon={<IconCheck />} />
        <StatTile label="Focused learning" value={`${view.stats.hoursLearnt}h`} hint="Across sessions and practice" icon={<IconTrend />} />
        <StatTile label="Matched mentors" value={String(view.recommended.length)} hint="Strong matches for your topics" icon={<IconUsers />} />
        <StatTile label="Current streak" value={view.stats.streak ? `${view.stats.streak} wk` : "—"} hint="Keep one session every week" icon={<IconCalendar />} />
      </div>

      {toRate && <div className="mt-6"><RateSessionCard session={toRate} /></div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          {next ? (
            <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-[0_12px_40px_rgb(23_26_43/0.055)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-primary-soft/80 to-surface px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-[softPulse_2s_ease-in-out_infinite] rounded-full bg-primary" />
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-text">Next session</p>
                </div>
                <Badge tone={next.status === "pending" ? "warning" : "primary"}>
                  {next.status === "pending" ? "Awaiting confirmation" : "Confirmed"}
                </Badge>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-end)] font-sans text-lg font-bold text-on-primary shadow-lg shadow-primary/20">
                    {next.with.split(" ").map((part) => part[0]).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary-text">{next.topic}</p>
                    <h2 className="mt-1 font-sans text-2xl font-semibold tracking-tight text-fg">{next.concept}</h2>
                    <p className="mt-2 text-sm text-muted">with <strong className="font-semibold text-fg">{next.with}</strong> · {next.year} {next.branch}</p>

                    <div className="mt-5 flex flex-wrap gap-2.5">
                      <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-xs font-semibold text-fg"><IconCalendar className="text-primary-text" /> {next.day}</span>
                      <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-xs font-semibold text-fg"><IconClock className="text-primary-text" /> {next.time} · {next.length}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                    {next.status !== "pending" && (
                      <Link href={`/chat?s=${next.id}`} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary ${focus}`}>
                        <IconMessage /> Open session
                      </Link>
                    )}
                    {cancel(next.id) && <Button variant="ghost" onClick={cancel(next.id)}>Withdraw</Button>}
                    {accept(next.id) && <Button variant="ghost" onClick={accept(next.id)}>Accept as {firstName}</Button>}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <EmptyState title="No session booked yet" body="Describe your blocker and compare transparent mentor match scores." action={<Link href="/discover" className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary ${focus}`}>Find a mentor <IconArrowRight /></Link>} />
          )}

          <ActivityChart
            title="Learning activity"
            value={view.stats.hoursLearnt > 0 ? `${view.stats.hoursLearnt}h 20m` : "1h 40m"}
            note="Focused time across sessions and practice"
            values={view.demo ? [22, 44, 31, 68, 48, 82, 56] : [12, 28, 18, 42, 35, 58, 30]}
            labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          />
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <ProgressRing
            value={view.demo ? 72 : 46}
            label={view.demo ? "3 of 4 tasks complete" : "Build your weekly rhythm"}
            detail={view.demo ? "One task remains from your latest AutoCAD session." : "Sessions and practice tasks contribute to your weekly goal."}
          />

          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div><h2 className="font-sans text-base font-semibold text-fg">Focus subjects</h2><p className="mt-0.5 text-[11px] text-faint">Used to personalize matching</p></div>
              <Link href="/onboarding" className="text-xs font-bold text-primary-text">Edit</Link>
            </div>
            <div className="space-y-4 p-5">
              {view.topics.slice(0, 4).map((topic, index) => (
                <div key={topic}>
                  <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-fg">{topic}</span><span className="text-faint">{[76, 58, 43, 31][index] ?? 25}%</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-inset"><div className="h-full rounded-full bg-primary" style={{ width: `${[76, 58, 43, 31][index] ?? 25}%` }} /></div>
                </div>
              ))}
              {view.topics.length === 0 && <p className="text-sm text-muted">No subjects selected yet.</p>}
            </div>
          </Card>

          {later.length > 0 && (
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Coming up next</p>
              <div className="mt-4 space-y-4">
                {later.slice(0, 2).map((session) => (
                  <div key={session.id} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div><p className="text-sm font-semibold text-fg">{session.topic}</p><p className="mt-1 text-xs text-faint">{session.day} · {session.time} with {session.with}</p></div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>

      <Section title="Recommended mentors" action={<Link href="/discover" className="text-xs font-bold text-primary-text">View all mentors →</Link>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {view.recommended.map((mentor, index) => (
            <article key={mentor.id} className="group rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(23_26_43/0.02)] transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_16px_38px_rgb(23_26_43/0.08)]">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft font-sans text-sm font-bold text-primary-text">{mentor.name.split(" ").map((part) => part[0]).join("")}</span>
                <span className="rounded-full bg-inset px-2.5 py-1 text-[10px] font-bold text-faint">{index === 0 ? "BEST MATCH" : `#${index + 1} MATCH`}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2"><h3 className="font-sans font-semibold text-fg">{mentor.name}</h3>{mentor.online && <span className="flex items-center gap-1 text-[11px] font-semibold text-success"><IconDot className="h-1.5 w-1.5" /> Online</span>}</div>
              <p className="mt-1 text-xs text-faint">{mentor.year} · {mentor.branch}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{mentor.skills.slice(0, 3).map((skill) => <span key={skill} className="rounded-md bg-inset px-2 py-1 text-[10px] font-semibold text-muted">{skill}</span>)}</div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <div><div className="flex items-center gap-1.5"><Stars rating={mentor.rating} /><strong className="text-xs text-fg">{mentor.rating}</strong></div><p className="mt-1 text-[10px] text-faint">{mentor.reviews} rated sessions</p></div>
                <Link href="/discover" className={`inline-flex min-h-9 items-center rounded-lg bg-primary-soft px-3 text-xs font-bold text-primary-text group-hover:bg-primary group-hover:text-on-primary ${focus}`}>View match</Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Doubts you've asked" action={doubts.length > 0 ? <Link href="/ask" className="text-xs font-bold text-primary-text">Ask another</Link> : undefined}>
        {doubts.length === 0 ? (
          <EmptyState title="Nothing asked yet" body="Post a question for seniors in your subject. No booking required." action={<Link href="/ask" className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary ${focus}`}><IconHelp /> Ask a doubt</Link>} />
        ) : (
          <ul className="space-y-3">
            {doubts.map((doubt) => (
              <li key={doubt.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-surface p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Badge>{doubt.topic}</Badge>{doubt.concept && <span className="text-xs text-faint">Gap: {doubt.concept}</span>}<span className="text-xs text-faint">{askedLabel(doubt.at)}</span></div>
                  <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-fg">{doubt.text}</p>
                  <p className="mt-2 text-xs text-faint">Waiting for a senior to pick it up. No slot is being held.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/chat?s=${doubt.id}`} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-inset ${focus}`}><IconMessage /> Open</Link>
                  <Button variant="ghost" onClick={() => { removeDoubt(account, doubt.id); refresh(); }}>Withdraw</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Your notes vault">
        <RecapVault account={account} recaps={view.recaps} sources={recapSources} refresh={refresh} />
      </Section>
    </DashboardShell>
  );
}
