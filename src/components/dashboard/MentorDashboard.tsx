"use client";

import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { DashboardGate, DashboardShell, EmptyState, Section, StatTile } from "./Shell";
import { RequestInbox } from "./RequestInbox";
import { OnlineToggle } from "./OnlineToggle";
import { ActivityChart } from "./ActivityChart";
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
        title={account ? "Set up your mentor workspace" : "Sign in to open your workspace"}
        body={account ? "Choose your strongest subjects and publish a few hours. Your dashboard will be built from that profile." : "Use your local profile or open the sample mentor account."}
        cta={account ? { href: "/onboarding", label: "Set up mentoring" } : { href: "/signin", label: "Go to sign in" }}
      />
    );
  }

  const next = view.sessions[0];
  const firstName = view.name.split(" ")[0];
  const peak = Math.max(1, ...Object.values(view.week));
  const pending = view.requests.length;

  return (
    <DashboardShell role="mentor" name={view.name} meta={[view.year, view.branch].filter(Boolean).join(" · ")} demo={view.demo}>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-text">Mentor overview</p>
          <h1 className="mt-1.5 font-sans text-3xl font-semibold tracking-tight text-fg sm:text-[34px]">Welcome back, {firstName}</h1>
          <p className="mt-2 text-sm text-muted">{pending ? `${pending} students are waiting for your response.` : "Your mentoring activity is all caught up."}</p>
        </div>
        <Link href="/onboarding" className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary shadow-[0_8px_22px_rgb(var(--primary-shadow)/0.22)] transition-all hover:-translate-y-0.5 hover:bg-primary-hover ${focus}`}>
          <IconCalendar /> Manage availability <IconArrowRight />
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="MentorScore" value={view.stats.mentorScore !== null ? String(view.stats.mentorScore) : "—"} hint="Confidence-weighted standing" icon={<IconTrend />} />
        <StatTile label="Average rating" value={view.stats.rating !== null ? view.stats.rating.toFixed(1) : "—"} hint={`${view.stats.reviews} rated sessions`} icon={<IconStar filled={false} />} />
        <StatTile label="Sessions held" value={String(view.stats.sessionsHeld)} hint="All-time completed sessions" icon={<IconUsers />} />
        <StatTile label="Response time" value={view.stats.responseTime ?? "—"} hint="Median over the last 30 days" icon={<IconClock />} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-sans text-lg font-semibold tracking-tight text-fg">Session requests</h2><p className="mt-1 text-xs text-faint">Review context before accepting a student.</p></div>
              {pending > 0 && <span className="rounded-full bg-warning-soft px-3 py-1.5 text-xs font-bold text-warning">{pending} awaiting response</span>}
            </div>
            {pending === 0 ? <EmptyState title="Inbox zero" body="New requests matching your subjects will appear here." /> : <RequestInbox requests={view.requests} />}
          </section>

          <ActivityChart
            title="Student demand"
            value={view.demo ? "18 requests" : `${view.requests.length} requests`}
            note="Requests and profile interest over the last seven days"
            values={view.demo ? [24, 46, 32, 71, 54, 86, 63] : [12, 18, 16, 28, 22, 36, 30]}
            labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          />
        </div>

        <aside className="space-y-5 lg:col-span-4">
          {next ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-line bg-gradient-to-r from-primary-soft to-surface px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-text">Next session</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-on-primary">{next.with.split(" ").map((part) => part[0]).join("")}</span>
                  <div><p className="font-sans text-sm font-semibold text-fg">{next.with}</p><p className="mt-0.5 text-xs text-faint">{next.year} · {next.branch}</p></div>
                </div>
                <h3 className="mt-5 font-sans text-lg font-semibold text-fg">{next.topic}</h3>
                <p className="mt-1 text-xs leading-5 text-muted">{next.concept}</p>
                <div className="mt-4 flex flex-wrap gap-2"><Badge tone="primary"><IconCalendar className="h-3 w-3" /> {next.day}</Badge><Badge><IconClock className="h-3 w-3" /> {next.time}</Badge></div>
                <div className="mt-5"><Button full><IconMessage /> Open session</Button></div>
              </div>
            </Card>
          ) : <EmptyState title="No upcoming session" body="Accepted bookings will appear here." />}

          <OnlineToggle />

          <Card>
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-sans text-base font-semibold text-fg">Availability</h2><p className="mt-1 text-xs text-faint">{view.weeklyHours} bookable hours</p></div><Link href="/onboarding" className="text-xs font-bold text-primary-text">Edit</Link></div>
            <div className="mt-5 flex h-28 items-end gap-2">
              {DAYS.map((day) => {
                const hours = view.week[day] ?? 0;
                return (
                  <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[9px] font-semibold text-faint">{hours}</span>
                    <div className="flex h-full w-full items-end rounded-md bg-inset px-1"><div className={`w-full rounded ${hours ? "bg-primary" : "bg-line"}`} style={{ height: `${Math.max((hours / peak) * 100, 6)}%` }} /></div>
                    <span className="text-[9px] font-semibold text-faint">{day.slice(0, 1)}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3"><h2 className="font-sans text-base font-semibold text-fg">Verified expertise</h2><IconShield className="text-success" /></div>
            <div className="mt-4 space-y-3">
              {view.skills.map((skill) => (
                <div key={skill.topic} className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-fg">{skill.topic}</span>{skill.confidence ? <Badge tone={skill.confidence === "High" ? "success" : "warning"}>{skill.confidence}</Badge> : <Badge>Claimed</Badge>}</div>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      <Section title="Open doubts in your subjects" action={view.doubts.length > 0 ? <span className="text-xs font-semibold text-faint">No booking required</span> : undefined}>
        {view.doubts.length === 0 ? (
          <EmptyState title="No open doubts" body="Questions in your claimed subjects will show up here." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {view.doubts.map((doubt) => (
              <article key={doubt.id} className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(23_26_43/0.02)]">
                <div className="flex flex-wrap items-center gap-2"><span className="font-sans text-sm font-semibold text-fg">{doubt.from}</span><span className="text-[11px] text-faint">{doubt.year}</span><Badge>{doubt.topic}</Badge><span className="ml-auto text-[10px] text-faint">{doubt.asked}</span></div>
                <p className="mt-4 text-sm leading-6 text-muted">{doubt.text}</p>
                <button type="button" className={`mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-soft px-4 text-xs font-bold text-primary-text hover:bg-primary hover:text-on-primary ${focus}`}><IconMessage /> Answer doubt</button>
              </article>
            ))}
          </div>
        )}
      </Section>
    </DashboardShell>
  );
}
