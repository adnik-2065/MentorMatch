"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Card, Chip, ChoiceGroup, Textarea } from "@/components/ui";
import { DashboardGate, DashboardShell, Section } from "@/components/dashboard/Shell";
import { TriageCard } from "@/components/triage/TriageCard";
import { IconArrowRight, IconCheck, IconMessage, IconSparkle, IconUsers } from "@/components/icons";
import { studentView, useAccount } from "@/lib/account";
import { addDoubt, type AskedDoubt } from "@/lib/doubts";
import { MENTORS, topicGroupsFor, type Triage } from "@/lib/onboarding";
import { requestTriage } from "@/lib/triage-client";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function AskPage() {
  const { ready, account, profile, bookings, refresh } = useAccount();
  const params = useSearchParams();

  const student = ready && account ? studentView(account, profile, bookings) : null;
  const topics = student?.topics ?? profile?.learnTopics ?? [];
  const branch = student?.branch ?? profile?.branch ?? "";
  const name = student?.name ?? profile?.name.trim() ?? "You";

  // A "Ask about X" link from a mentor card lands here with the subject chosen.
  const [subject, setSubject] = useState(params.get("topic") ?? "");
  const [text, setText] = useState("");
  const [triage, setTriage] = useState<Triage | null>(null);
  const [reading, setReading] = useState(false);
  const [asked, setAsked] = useState<AskedDoubt | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (!ready || !account) {
    return (
      <DashboardGate
        ready={ready}
        signedIn={false}
        title="Sign in to ask a doubt"
        body="A doubt carries your year and branch so the right seniors see it. Finish onboarding, or open the sample account to try it."
        cta={{ href: "/signin", label: "Go to sign in" }}
      />
    );
  }

  // Your own subjects first; the rest of the branch is one click away.
  const everything = topicGroupsFor(branch).flatMap((g) => g.topics);
  const subjects = showAll
    ? [...topics, ...everything.filter((t) => !topics.includes(t))]
    : topics.length > 0
      ? topics
      : everything.slice(0, 10);

  const more = !showAll && everything.some((t) => !subjects.includes(t));
  const written = text.trim();
  const canAsk = subject.length > 0 && written.length >= 12;
  const listening = MENTORS.filter((m) => m.skills.includes(subject)).length;

  function ask() {
    if (!account || !canAsk) return;

    // No triage run means no concept gap — better blank than invented.
    setAsked(addDoubt(account, { topic: subject, text: written, concept: triage?.concept ?? "" }));
    refresh();
  }

  function reset() {
    setAsked(null);
    setText("");
    setTriage(null);
  }

  async function read() {
    setReading(true);
    // `requestTriage` always resolves — the keyword table answers when the
    // route or the model doesn't, so there's no error branch to render.
    setTriage(await requestTriage(written, { branch, topics }));
    setReading(false);
  }

  return (
    <DashboardShell
      role="student"
      name={name}
      meta={[student?.year ?? profile?.year ?? "", branch].filter(Boolean).join(" · ")}
      demo={student?.demo ?? account === "demo"}
    >
      <div className="max-w-2xl">
        <h1 className="font-sans text-2xl font-semibold text-fg sm:text-3xl">Ask a doubt</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          No slot, nobody to wait on. It goes to every senior who claims the subject and the first
          one free picks it up — for the questions that don&apos;t need 45 minutes.
        </p>
      </div>

      {asked ? (
        <Card className="mt-8 border-success/30 bg-success-soft">
          <Badge tone="success">
            <IconCheck className="h-3 w-3" />
            Doubt posted
          </Badge>
          <p className="mt-3 font-sans text-lg font-semibold text-fg">{asked.topic}</p>
          <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-muted">
            &ldquo;{asked.text}&rdquo;
          </p>
          <p className="mt-3 max-w-[58ch] text-xs leading-relaxed text-faint">
            It&apos;s in the feed of every senior who claims {asked.topic}. The room is open from
            now — nothing to accept, because nobody&apos;s time is being booked.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/chat?s=${asked.id}`}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
            >
              <IconMessage />
              Open the room
            </Link>
            <Link
              href="/dashboard"
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`}
            >
              Back to dashboard
              <IconArrowRight />
            </Link>
            <Button variant="ghost" onClick={reset}>
              Ask another
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Section
            title="Which subject?"
            action={
              more ? (
                <Button variant="ghost" onClick={() => setShowAll(true)}>
                  Something else
                </Button>
              ) : undefined
            }
          >
            <Card>
              <ChoiceGroup
                single
                label="Subject"
                hint="One subject — a doubt spread across four of them reaches nobody."
              >
                {subjects.map((topic) => (
                  <Chip
                    key={topic}
                    single
                    label={topic}
                    selected={topic === subject}
                    onClick={() => setSubject(topic)}
                  />
                ))}
              </ChoiceGroup>
              <p aria-live="polite" className="mt-3.5 flex items-center gap-1.5 text-xs text-faint">
                <IconUsers className="h-3.5 w-3.5" />
                {subject
                  ? `${listening} senior${listening === 1 ? "" : "s"} claim ${subject} right now`
                  : "Pick one so the right seniors see it."}
              </p>
            </Card>
          </Section>

          <Section title="What are you stuck on?">
            <Card>
              <Textarea
                id="doubt-text"
                label="Ask it the way you'd ask a friend"
                hint="Paste the error, the step you're stuck at, whatever you have. Two lines is enough."
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Why does my cube test give lower strength at 28 days than at 7 days?"
              />

              {triage && <TriageCard triage={triage} className="mt-4" />}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button onClick={ask} disabled={!canAsk}>
                  <IconMessage />
                  {subject ? `Ask the ${subject} seniors` : "Pick a subject first"}
                </Button>
                <Button variant="ghost" disabled={written.length < 12 || reading} onClick={read}>
                  <IconSparkle />
                  {reading ? "Reading your doubt…" : "Name the concept gap"}
                </Button>
              </div>

              <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-faint">
                Needs 45 minutes and a screen share instead?{" "}
                <Link
                  href="/book"
                  className={`rounded font-medium text-primary-text underline underline-offset-4 ${focus}`}
                >
                  Book a session
                </Link>
                .
              </p>
            </Card>
          </Section>
        </>
      )}

      <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        {account === "demo"
          ? "Sample account — you're Meera on the mentoring side, so a doubt in a subject she claims lands in your own feed on /mentor. It never touches your own account."
          : "Doubts are kept in this browser until the backend lands. Routing them to the seniors who claim the subject is a server job."}
      </p>
    </DashboardShell>
  );
}
