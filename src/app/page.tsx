import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconDot,
  IconSearch,
  IconShield,
  IconSparkle,
  IconStar,
} from "@/components/icons";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

/** The five steps, start to finish. Each one is a real surface, not a mockup. */
const steps = [
  {
    title: "Describe your doubt",
    body: "Type the problem or paste the error log. No slot to book, no form to fill.",
  },
  {
    title: "AI reads it",
    body: "Gemini names the subject and the concept gap underneath the symptom, plus what to read next.",
  },
  {
    title: "Get matched",
    body: "Seniors who've proven that subject, ranked by rating and who's free soonest.",
  },
  {
    title: "Learn in a session",
    body: "One room per session and per doubt — paste code, ask the follow-up, no scheduling ping-pong.",
  },
  {
    title: "Recap & progress",
    body: "A written recap of what you covered and two or three practice tasks you can tick off.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-bg">
      <header className="border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
          <Link href="/" className={`flex items-center gap-2 font-sans font-semibold text-fg ${focus}`}>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/20"><IconSparkle /></span>
            MentorMatch
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Link href="/signin" className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-inset hover:text-fg ${focus}`}>Sign in</Link>
            <Link href="/onboarding" className={`rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 hover:bg-primary-hover ${focus}`}>Get started</Link>
          </nav>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-28">
        <div aria-hidden="true" className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-text"><IconSparkle className="h-3.5 w-3.5" /> Built for campus learning</p>
          <h1 className="mt-6 max-w-[14ch] font-sans text-5xl font-semibold leading-[1.04] tracking-[-0.035em] text-fg sm:text-6xl">The right senior for the exact thing you&apos;re stuck on.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">Go beyond generic tutor listings. MentorMatch understands your blocker, explains every match, and helps you book a senior who has already solved it.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/onboarding" className={`inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-on-primary shadow-[0_12px_28px_rgb(var(--primary-shadow)/0.24)] transition-transform hover:-translate-y-0.5 hover:bg-primary-hover ${focus}`}>Create your workspace <IconArrowRight /></Link>
            <Link href="/discover" className={`inline-flex min-h-12 items-center gap-2 rounded-xl border border-line-strong bg-surface px-6 text-sm font-semibold text-fg shadow-sm hover:border-primary/30 hover:bg-primary-soft/40 ${focus}`}><IconSearch /> Explore mentors</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-faint">
            <span className="flex items-center gap-1.5"><IconCheck className="text-success" /> No OTP setup</span>
            <span className="flex items-center gap-1.5"><IconCheck className="text-success" /> Transparent match scores</span>
            <span className="flex items-center gap-1.5"><IconCheck className="text-success" /> Browser-local prototype</span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[2rem] border border-line bg-surface/80 p-3 shadow-[0_35px_90px_rgb(0_0_0/0.32)] backdrop-blur-xl">
            <div className="rounded-[1.4rem] bg-nav p-5 text-white sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-widest text-nav-muted">Smart match</p><h2 className="mt-1 font-sans text-xl font-semibold">Docker container exits on startup</h2></div>
                <span className="rounded-xl bg-white/10 px-3 py-2 text-xs text-nav-muted">3 matches</span>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-surface p-3 text-sm text-faint"><IconSearch /> Describe your blocker, not just the subject</div>
            </div>
            <div className="space-y-3 p-2 pt-4 sm:p-4">
              <PreviewMentor rank="01" name="Aarav S." meta="3rd Year · CSE" score="94" online />
              <PreviewMentor rank="02" name="Nisha R." meta="4th Year · IT" score="88" />
            </div>
          </div>
          <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-line bg-surface p-4 shadow-xl sm:block">
            <p className="flex items-center gap-2 text-xs font-semibold text-success"><IconShield /> Verified skill evidence</p>
            <p className="mt-1.5 text-xs text-faint">Real projects, not profile claims</p>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-3">
          <Feature icon={<IconSearch />} title="Context-aware matching" body="Topic fit, branch, proof, ratings and availability combine into one explainable score." />
          <Feature icon={<IconShield />} title="Trust you can inspect" body="Verified evidence is clearly separated from self-claimed experience." />
          <Feature icon={<IconCalendar />} title="From blocker to booking" body="Compare open slots and confirm a session without leaving the matching flow." />
        </div>
      </section>
      <section className="mx-auto max-w-7xl border-t border-line px-5 py-14 sm:px-8">
        <h2 className="font-sans text-2xl font-semibold text-fg">From blocker to progress</h2>
        <p className="mt-1.5 max-w-[56ch] text-sm leading-relaxed text-muted">
          From a pasted error to something you can practise, in five steps.
        </p>

        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-sans text-sm font-semibold tabular-nums text-primary-text"
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-sans text-base font-semibold text-fg">{step.title}</h3>
                <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="mx-auto max-w-7xl border-t border-line px-5 py-6 text-xs leading-relaxed text-faint sm:px-8">
        Early build — onboarding, dashboards, booking, async doubts and session chat all work on
        browser-local data. Profiles can also sync to Postgres; triage and recaps call Gemini
        through server API routes and fall back to offline rules when it isn&apos;t reachable.
      </p>
    </main>
  );
}

function PreviewMentor({ rank, name, meta, score, online = false }: { rank: string; name: string; meta: string; score: string; online?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <span className="text-xs font-semibold text-faint">{rank}</span>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft font-sans text-sm font-bold text-primary-text">{name.split(" ").map((part) => part[0]).join("")}</span>
      <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-sans text-sm font-semibold text-fg">{name}{online && <IconDot className="h-1.5 w-1.5 text-success" />}</p><p className="mt-0.5 text-xs text-faint">{meta}</p><p className="mt-2 flex items-center gap-1 text-[11px] text-warning"><IconStar className="h-3 w-3" /> 4.9 · Docker verified</p></div>
      <div className="text-center"><p className="text-lg font-bold text-primary-text">{score}%</p><p className="text-[9px] uppercase tracking-wide text-faint">match</p></div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return <div><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text">{icon}</span><h2 className="mt-4 font-sans text-lg font-semibold text-fg">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{body}</p></div>;
}
