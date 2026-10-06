"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Card, Chip, Stars, Textarea } from "@/components/ui";
import { DashboardGate, DashboardShell, EmptyState, Section } from "@/components/dashboard/Shell";
import {
  IconArrowRight,
  IconCalendar,
  IconClose,
  IconDot,
  IconHourglass,
  IconSearch,
  IconShield,
  IconSparkle,
} from "@/components/icons";
import { studentView, useAccount } from "@/lib/account";
import { addBooking, slotsOf, type Booking } from "@/lib/bookings";
import { searchMentors } from "@/lib/dashboard";
import { type Mentor, type Triage } from "@/lib/onboarding";
import { requestTriage } from "@/lib/triage-client";
import { TriageCard } from "@/components/triage/TriageCard";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

type Slot = { day: string; time: string };

function MentorRow({
  mentor,
  taken,
  selected,
  onPick,
}: {
  mentor: Mentor;
  taken: { day: string; time: string; taken: boolean }[];
  selected: Slot | null;
  onPick: (slot: Slot) => void;
}) {
  return (
    <li
      className={`rounded-xl border p-5 transition-colors duration-200 ${
        selected ? "border-primary bg-primary-soft/40" : "border-line bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
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
            {mentor.year} · {mentor.branch}
          </p>
          <p className="mt-2 max-w-[52ch] text-sm text-muted">{mentor.skills.join(" · ")}</p>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Stars rating={mentor.rating} />
            <span className="text-sm font-medium tabular-nums text-fg">{mentor.rating}</span>
          </div>
          <p className="mt-0.5 text-xs text-faint">{mentor.reviews} sessions</p>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-xs font-medium text-faint">Open slots this week</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {taken.map((slot) => {
            const active = selected?.day === slot.day && selected?.time === slot.time;
            return (
              <button
                key={`${slot.day}-${slot.time}`}
                type="button"
                aria-pressed={active}
                disabled={slot.taken}
                onClick={() => onPick({ day: slot.day, time: slot.time })}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:border-line disabled:bg-inset disabled:text-faint ${focus} ${
                  active
                    ? "border-primary bg-primary font-medium text-on-primary"
                    : "border-line bg-surface text-muted hover:border-primary hover:text-fg"
                }`}
              >
                {slot.day} {slot.time}
                {/* "taken" covers both: a slot you've only asked for is held too. */}
                {slot.taken && <span className="text-xs">· taken</span>}
              </button>
            );
          })}
        </div>
      </div>
    </li>
  );
}

export function BookingPage() {
  const { ready, account, profile, bookings, refresh } = useAccount();
  const params = useSearchParams();

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ mentor: Mentor; slot: Slot } | null>(null);
  const [doubt, setDoubt] = useState("");
  const [triage, setTriage] = useState<Triage | null>(null);
  const [reading, setReading] = useState(false);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  const student = ready && account ? studentView(account, profile, bookings) : null;
  const topics = student?.topics ?? profile?.learnTopics ?? [];
  const branch = student?.branch ?? profile?.branch ?? "";
  const name = student?.name ?? profile?.name?.trim() ?? "You";

  const results = useMemo(() => searchMentors(query, { topics, branch }), [query, topics, branch]);

  // A "Book" link from the dashboard lands on that mentor — scroll past the rest.
  const preselect = params.get("mentor");
  const ordered = useMemo(() => {
    if (!preselect) return results;
    const first = results.filter((m) => m.id === preselect);
    return [...first, ...results.filter((m) => m.id !== preselect)];
  }, [results, preselect]);

  if (!ready || !account) {
    return (
      <DashboardGate
        ready={ready}
        signedIn={false}
        title="Sign in to book a session"
        body="Booking needs an account so the mentor knows who's turning up. Finish onboarding, or open the sample account to try it."
        cta={{ href: "/signin", label: "Go to sign in" }}
      />
    );
  }

  function confirm() {
    if (!picked || !account) return;

    const matched =
      triage?.topic ??
      picked.mentor.skills.find((s) => topics.includes(s)) ??
      picked.mentor.skills.find((s) => s.toLowerCase().includes(query.trim().toLowerCase())) ??
      picked.mentor.skills[0];

    const booking = addBooking(account, {
      mentorId: picked.mentor.id,
      mentorName: picked.mentor.name,
      year: picked.mentor.year,
      branch: picked.mentor.branch,
      topic: matched,
      // Without a triage run, the junior's own words are the best summary we have.
      concept: triage?.concept || doubt.trim().slice(0, 80),
      day: picked.slot.day,
      time: picked.slot.time,
      length: "45 min",
    });

    setConfirmed(booking);
    refresh();
  }

  function reset() {
    setConfirmed(null);
    setPicked(null);
    setDoubt("");
    setTriage(null);
  }

  async function read() {
    setReading(true);
    // Always resolves — offline keywords answer when the model can't.
    setTriage(await requestTriage(doubt, { branch, topics }));
    setReading(false);
  }

  return (
    <DashboardShell
      role="student"
      name={name}
      meta={[student?.year ?? profile?.year ?? "", branch].filter(Boolean).join(" ")}
      demo={student?.demo ?? account === "demo"}
    >
      <div className="max-w-2xl">
        <h1 className="font-sans text-2xl font-semibold text-fg sm:text-3xl">Book a session</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Search a subject or a name and ask for a slot. The senior accepts it and the room opens in
          chat — 45 minutes, free, no back-and-forth to arrange it.
        </p>
      </div>

      {confirmed ? (
        <Card className="mt-8 border-warning/30 bg-warning-soft">
          <Badge tone="warning">
            <IconHourglass className="h-3 w-3" />
            Request sent
          </Badge>
          <p className="mt-3 font-sans text-xl font-semibold text-fg">
            {confirmed.day}, {confirmed.time} · {confirmed.mentorName}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {confirmed.topic}
            {confirmed.concept ? ` — ${confirmed.concept}` : ""}
          </p>
          <p className="mt-3 max-w-[58ch] text-xs leading-relaxed text-faint">
            {confirmed.mentorName.split(" ")[0]} has to accept before the session is on. The slot is
            held for you until then, and chat opens the moment they say yes — most seniors reply the
            same day.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
            >
              Go to dashboard
              <IconArrowRight />
            </Link>
            <Button variant="ghost" onClick={reset}>
              Ask someone else too
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            <label htmlFor="mentor-search" className="sr-only">
              Search by subject, branch or mentor name
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint">
                <IconSearch />
              </span>
              <input
                id="mentor-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Structural Analysis, DSA, Thermodynamics…"
                className={`min-h-11 w-full rounded-lg border border-line bg-surface py-2.5 pr-10 pl-10 text-sm text-fg transition-colors duration-200 placeholder:text-faint hover:border-line-strong focus-visible:border-primary ${focus}`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={`absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-2 text-faint transition-colors duration-200 hover:bg-inset hover:text-fg ${focus}`}
                >
                  <IconClose />
                  <span className="sr-only">Clear search</span>
                </button>
              )}
            </div>

            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.slice(0, 6).map((topic) => (
                  <Chip
                    key={topic}
                    label={topic}
                    selected={query === topic}
                    onClick={() => setQuery(query === topic ? "" : topic)}
                  />
                ))}
              </div>
            )}
          </div>

          <Section
            title={query ? `Mentors for “${query}”` : "Mentors for your subjects"}
            action={
              <span className="text-xs text-faint">
                {ordered.length} {ordered.length === 1 ? "mentor" : "mentors"} · top rated first
              </span>
            }
          >
            {ordered.length === 0 ? (
              <EmptyState
                title="Nobody listed for that yet"
                body="Nothing matched that subject or name. Try a broader search — or the subject chips above."
                action={
                  <Button variant="outline" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {ordered.map((mentor) => (
                  <MentorRow
                    key={mentor.id}
                    mentor={mentor}
                    taken={slotsOf(mentor, bookings)}
                    selected={picked?.mentor.id === mentor.id ? picked.slot : null}
                    onPick={(slot) => setPicked({ mentor, slot })}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section title="Confirm">
            <Card>
              <p aria-live="polite" className="text-sm text-muted">
                {picked ? (
                  <>
                    <span className="font-medium text-fg">{picked.mentor.name}</span> ·{" "}
                    {picked.slot.day} {picked.slot.time} · 45 min
                  </>
                ) : (
                  "Pick a slot above to continue."
                )}
              </p>

              <div className="mt-4">
                <Textarea
                  id="booking-doubt"
                  label="What are you stuck on? (optional)"
                  hint="One or two lines is enough. It goes to the mentor with your request."
                  rows={3}
                  value={doubt}
                  onChange={(e) => setDoubt(e.target.value)}
                  placeholder="My STAAD model shows huge moments at the support…"
                />
              </div>

              {triage && <TriageCard triage={triage} className="mt-4" />}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button onClick={confirm} disabled={!picked}>
                  <IconCalendar />
                  {picked ? `Ask for ${picked.slot.day} ${picked.slot.time}` : "Pick a slot first"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={doubt.trim().length < 12 || reading}
                  onClick={read}
                >
                  <IconSparkle />
                  {reading ? "Reading your doubt…" : "Find the concept gap"}
                </Button>
              </div>
            </Card>
          </Section>
        </>
      )}

      <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        {account === "demo"
          ? "Sample account — anything you book here stays inside the sample account and never touches your own."
          : "Bookings are saved in this browser until the backend lands. Slots come from what each mentor published."}
      </p>
    </DashboardShell>
  );
}
