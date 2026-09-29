import Link from "next/link";
import { IconArrowRight, IconShield, IconSparkle, IconCalendar } from "@/components/icons";

const points = [
  {
    icon: <IconShield className="h-5 w-5" />,
    title: "Verified, not self-declared",
    body: "SkillProof reads a senior's real repos and quizzes them on their own code before the badge appears.",
  },
  {
    icon: <IconSparkle className="h-5 w-5" />,
    title: "Describe the bug, get the person",
    body: "Paste an error and we find the underlying concept gap — then route you to someone who's fixed it.",
  },
  {
    icon: <IconCalendar className="h-5 w-5" />,
    title: "Real slots, real ratings",
    body: "Mentors publish weekly availability. You rate the session afterwards, and top rated show up first.",
  },
];

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
    <main className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-6 sm:py-28">
      <p className="text-sm font-medium tracking-wide text-primary-text uppercase">MentorMatch</p>

      <h1 className="mt-4 max-w-[18ch] font-sans text-4xl leading-[1.1] font-semibold text-fg sm:text-5xl">
        Find the senior who already solved it.
      </h1>

      <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-muted">
        You&apos;re a first-year stuck on pointers in C. Two floors above you is a third-year who
        debugged the exact same segfault last semester. MentorMatch finds that person.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/onboarding"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-on-primary transition-colors duration-200 outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Get started
          <IconArrowRight />
        </Link>
        <a
          href="https://github.com/adnik-2065/MentorMatch"
          className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-surface px-6 text-sm font-medium text-fg transition-colors duration-200 outline-none hover:bg-inset focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Read the README
        </a>
      </div>

      <p className="mt-6 text-sm text-faint">
        Already onboarded?{" "}
        <Link
          href="/signin"
          className="font-medium text-primary-text underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in
        </Link>{" "}
        — or open a sample account from there.
      </p>

      <ul className="mt-16 grid gap-6 sm:grid-cols-3">
        {points.map((p) => (
          <li key={p.title}>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
              {p.icon}
            </span>
            <h2 className="mt-3.5 font-sans text-base font-semibold text-fg">{p.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.body}</p>
          </li>
        ))}
      </ul>

      <section className="mt-20 border-t border-line pt-10">
        <h2 className="font-sans text-2xl font-semibold text-fg">How it works</h2>
        <p className="mt-1.5 max-w-[56ch] text-sm leading-relaxed text-muted">
          From a pasted error to something you can practise, in five steps.
        </p>

        <ol className="mt-8 space-y-6">
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

      <p className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        Early build — onboarding, dashboards, booking, async doubts and session chat all work on
        mock data held in your browser. Triage and recaps call Gemini through this app&apos;s own
        API routes, and fall back to an offline keyword table when it isn&apos;t reachable. The
        database comes next.
      </p>
    </main>
  );
}
