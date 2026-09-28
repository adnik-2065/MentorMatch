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

      <p className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        Early build — onboarding is wired up with mock data. Chat, booking and the AI layer come
        next.
      </p>
    </main>
  );
}
