"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card, Chip, Stars, StepHeading, Textarea } from "@/components/ui";
import { PlacementTargetField } from "@/components/PlacementTargetField";
import { ExperienceDisclosure, MentorSourceBadges, PlacementBadge } from "@/components/MentorExperience";
import { TopicPicker } from "./TopicPicker";
import { StepActions, type StepNav } from "./StepActions";
import { IconDot, IconShield, IconSparkle } from "@/components/icons";
import {
  matchMentors,
  runTriage,
  TARGET_COMPANIES,
  TARGET_JOB_ROLES,
  type MentorMatch,
  type OnboardingState,
} from "@/lib/onboarding";
import { hasPlacementGoals, prepTopicsFor } from "@/lib/placement";
import { useMentorDirectory } from "@/lib/mentorDirectory";
import { requestTriage } from "@/lib/triage-client";

type Patch = (patch: Partial<OnboardingState>) => void;
type StepProps = { state: OnboardingState; patch: Patch; nav: StepNav };

const toggleIn = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export function LearnTopicsStep({ state, patch, nav }: StepProps) {
  const { errors } = nav;
  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Subjects"
        title="What do you want to learn?"
        subtitle="Pick a few. This drives your feed and the mentors we surface first."
      />

      <div
        id="learn-topics"
        tabIndex={-1}
        aria-invalid={errors.learnTopics ? true : undefined}
        aria-describedby={errors.learnTopics ? "learn-topics-error" : undefined}
        className="outline-none"
      >
        <TopicPicker
          label="Subjects"
          hint="Your branch first. Switch to all branches, or type a subject we've missed."
          branch={state.branch}
          selected={state.learnTopics}
          onToggle={(topic) => patch({ learnTopics: toggleIn(state.learnTopics, topic) })}
        />
        {errors.learnTopics && (
          <p id="learn-topics-error" className="mt-2 text-xs font-medium text-danger">
            {errors.learnTopics}
          </p>
        )}
      </div>

      <StepActions
        onBack={nav.back}
        onContinue={() => nav.next()}
        continueLabel={state.learnTopics.length > 0 ? `Continue with ${state.learnTopics.length}` : "Continue"}
        errorCount={Object.keys(errors).length}
      />
    </div>
  );
}

/** Current year onwards, plus whatever the student already saved (e.g. "Winter 2026"). */
function seasonOptions(current: string) {
  const year = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(year + i));
  return current && !years.includes(current) ? [current, ...years] : years;
}

export function PlacementGoalsStep({ state, patch, nav }: StepProps) {
  const { errors } = nav;
  const prepTopics = prepTopicsFor(state.targetRoles);

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Optional"
        title="Preparing for placements?"
        subtitle="Add the companies and positions you're aiming for. Everything here is optional and you can change it later from Discover."
      />

      <Card className="border-primary/25 bg-primary-soft/50">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-primary-text">
            <IconSparkle />
          </span>
          <div className="space-y-1.5 text-sm leading-relaxed text-muted">
            <p>
              Mentors whose <span className="font-medium text-fg">self-reported</span> experience matches more of your
              goals are suggested first. Subject fit, rating and availability still count.
            </p>
            <p className="text-xs text-faint">
              MentorMatch doesn&apos;t verify employment. Mentors don&apos;t represent their employers and can&apos;t
              promise referrals, interviews or offers.
            </p>
          </div>
        </div>
      </Card>

      <PlacementTargetField
        id="target-companies"
        label="Target companies"
        hint="Search the list or add your own."
        placeholder="Search or add a company"
        options={TARGET_COMPANIES}
        selected={state.targetCompanies}
        error={errors.targetCompanies}
        onChange={(targetCompanies) => patch({ targetCompanies })}
      />
      <PlacementTargetField
        id="target-roles"
        label="Target positions"
        hint="For example Data Scientist, AI Researcher, SDE or Product Manager — or add your own."
        placeholder="Search or add a position"
        options={TARGET_JOB_ROLES}
        selected={state.targetRoles}
        error={errors.targetRoles}
        onChange={(targetRoles) => patch({ targetRoles })}
      />

      <div className="space-y-1.5">
        <label htmlFor="placement-season" className="block text-sm font-medium text-fg">
          Placement season (optional)
        </label>
        <select
          id="placement-season"
          value={state.placementSeason}
          aria-invalid={errors.placementSeason ? true : undefined}
          aria-describedby={errors.placementSeason ? "placement-season-error" : "placement-season-hint"}
          onChange={(e) => patch({ placementSeason: e.target.value })}
          className={`min-h-12 w-full rounded-xl border bg-surface px-4 text-sm text-fg shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-60 ${errors.placementSeason ? "border-danger" : "border-line"}`}
        >
          <option value="">Not sure yet</option>
          {seasonOptions(state.placementSeason).map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
        <p id="placement-season-hint" className="text-xs text-faint">
          Saved with your profile so mentors know your timeline. It doesn&apos;t change the ranking.
        </p>
        {errors.placementSeason && (
          <p id="placement-season-error" className="text-xs font-medium text-danger">
            {errors.placementSeason}
          </p>
        )}
      </div>

      {prepTopics.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-fg">Prep topics for these positions</legend>
          <p className="text-xs text-faint">Adding a topic also adds it to your subjects, so it counts toward matching.</p>
          <div className="flex flex-wrap gap-2">
            {prepTopics.map((topic) => (
              <Chip
                key={topic}
                label={topic}
                selected={state.learnTopics.includes(topic)}
                onClick={() => patch({ learnTopics: toggleIn(state.learnTopics, topic) })}
              />
            ))}
          </div>
        </fieldset>
      )}

      <StepActions
        onBack={nav.back}
        onSkip={nav.skip}
        onContinue={() => nav.next()}
        errorCount={Object.keys(errors).length}
      />
    </div>
  );
}

/** The example doubt is worth tailoring — it's what tells people how much detail to give. */
const STUCK_EXAMPLES: Record<string, string> = {
  CSE: "Example: my docker container exits immediately and my code changes never show up",
  IT: "Example: my docker container exits immediately and my code changes never show up",
  ECE: "Example: my Arduino interrupt fires twice for a single button press",
  Electrical: "Example: my transformer's efficiency comes out above 100% in the no-load test",
  Mechanical: "Example: I can't figure out which control volume to take for this steam turbine problem",
  Civil: "Example: my STAAD model shows huge moments at the support and I think my supports are wrong",
  Chemical: "Example: my mass balance doesn't close across the distillation column",
  Aerospace: "Example: my XFLR5 polar looks wrong past stall and I don't know what to change",
  Automobile: "Example: I don't understand how gear ratios change the torque at the wheels",
  Biotech: "Example: my PCR gives no band and I can't tell if it's the primers or the annealing temperature",
};

export function StuckStep({ state, patch, nav }: StepProps) {
  const [running, setRunning] = useState(false);
  const error = nav.errors.stuckOn;

  const run = async () => {
    const text = state.stuckOn.trim();
    if (text.length < 10) return nav.next();
    setRunning(true);
    try {
      const triage = await requestTriage(state.stuckOn, {
          branch: state.branch,
          topics: state.learnTopics,
      });
      nav.next({ triage });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Optional"
        title="What are you stuck on right now?"
        subtitle="Paste an error or just describe it. We'll use it to point you at the right concept and seniors."
      />

      <Textarea
        id="stuck"
        label="Your problem (optional)"
        hint={STUCK_EXAMPLES[state.branch] ?? STUCK_EXAMPLES.CSE}
        rows={5}
        value={state.stuckOn}
        placeholder="Describe it the way you'd say it out loud…"
        error={error}
        onChange={(e) => patch({ stuckOn: e.target.value, triage: null })}
      />

      <StepActions
        onBack={nav.back}
        onSkip={nav.skip}
        onContinue={run}
        busy={running}
        continueLabel={running ? "Reading your problem…" : "Find mentors"}
        errorCount={error ? 1 : 0}
      />
      <span aria-live="polite" className="sr-only">
        {running ? "Analysing your problem" : ""}
      </span>
    </div>
  );
}

function MentorCard({
  match,
  rank,
  booking,
  onPick,
}: {
  match: MentorMatch;
  rank: number;
  booking: OnboardingState["booking"];
  onPick: (day: string, time: string) => void;
}) {
  const { mentor, placement } = match;
  const isBooked = booking?.mentor.id === mentor.id;
  const reason = placement?.explanation ?? match.reasons[0];

  return (
    <li
      className={`rounded-xl border p-5 transition-colors duration-200 ${
        isBooked ? "border-primary bg-primary-soft/40" : "border-line bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs tabular-nums text-faint">#{rank}</span>
            <h3 className="font-sans font-semibold text-fg">{mentor.name}</h3>
            {placement && <PlacementBadge tier={placement.tier} />}
            {mentor.verified !== "claimed" && (
              <Badge tone="success">
                <IconShield className="h-3 w-3" />
                Skills verified
              </Badge>
            )}
            {mentor.online && (
              <Badge tone="primary">
                <IconDot className="h-1.5 w-1.5" />
                Online
              </Badge>
            )}
            <MentorSourceBadges mentor={mentor} />
          </div>
          <p className="mt-1 text-xs text-faint">
            {mentor.year} · {mentor.branch}
          </p>
          {reason && <p className="mt-2.5 max-w-[60ch] text-sm leading-relaxed text-muted">{reason}</p>}
          {match.matchedSkills.length > 0 && (
            <p className="mt-1.5 text-xs text-faint">Teaches: {match.matchedSkills.join(", ")}</p>
          )}
        </div>

        {mentor.reviews > 0 && (
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Stars rating={mentor.rating} />
              <span className="text-sm font-medium tabular-nums text-fg">{mentor.rating}</span>
            </div>
            <p className="mt-0.5 text-xs text-faint">{mentor.reviews} sessions</p>
          </div>
        )}
      </div>

      <div className="mt-3">
        <ExperienceDisclosure experience={mentor.experience} />
      </div>

      <fieldset className="mt-3 border-t border-line pt-4">
        <legend className="sr-only">Request a session with {mentor.name}</legend>
        <p aria-hidden="true" className="text-xs font-medium text-faint">Request a session</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {mentor.slots.map((slot) => {
            const selected = isBooked && booking?.day === slot.day && booking?.time === slot.time;
            return (
              <button
                key={`${slot.day}-${slot.time}`}
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(slot.day, slot.time)}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-3.5 text-sm transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                  selected
                    ? "border-primary bg-primary font-medium text-on-primary"
                    : "border-line bg-surface text-muted hover:border-primary hover:text-fg"
                }`}
              >
                {slot.day} {slot.time}
              </button>
            );
          })}
        </div>
      </fieldset>
    </li>
  );
}

const DIRECTORY_NOTE = {
  loading: "Loading registered mentors…",
  live: null,
  unavailable: "Showing sample profiles only — profile storage isn't configured on this server yet.",
  error: "Couldn't load registered mentors right now, so only sample profiles are shown.",
} as const;

export function MatchStep({ state, patch, nav }: StepProps) {
  const directory = useMentorDirectory();
  const triage = state.triage;
  const withGoals = hasPlacementGoals(state);

  const matches = matchMentors(
    {
      query: state.stuckOn,
      topics: triage ? [triage.topic, ...state.learnTopics] : state.learnTopics,
      branch: state.branch,
      targetCompanies: state.targetCompanies,
      targetRoles: state.targetRoles,
    },
    directory.mentors,
  )
    .filter((m) => m.mentor.slots.length > 0)
    .slice(0, 3);
  const exactCount = matches.filter((m) => m.placement?.tier === "exact").length;
  const note = DIRECTORY_NOTE[directory.status];

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Suggested mentors"
        title={matches.length > 0 ? "Here's who can help" : "No mentors to suggest yet"}
        subtitle={
          matches.length > 0
            ? "Ranked by your goals, subjects, branch, rating and availability. Pick a slot to request a session, or come back later."
            : "Nobody currently teaches your subjects with open slots. You can finish setup and browse all mentors in Discover."
        }
      />

      {note && (
        <p role="status" className="rounded-xl border border-line bg-inset/60 px-4 py-3 text-sm text-muted">
          {note}
        </p>
      )}

      {triage && (
        <Card className="border-primary/25 bg-primary-soft/50">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">
              <IconSparkle className="h-3 w-3" />
              Concept gap
            </Badge>
            <span className="font-sans font-semibold text-fg">{triage.concept}</span>
            <Badge>{triage.topic}</Badge>
          </div>
          <p className="mt-2.5 max-w-[60ch] text-sm leading-relaxed text-muted">{triage.explanation}</p>
        </Card>
      )}

      {withGoals && matches.length > 0 && exactCount === 0 && (
        <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-muted">
          No mentor matches all of your placement goals yet, so the closest partial and related matches are shown.
        </p>
      )}

      {matches.length > 0 && (
        <ul className="space-y-3">
          {matches.map((match, i) => (
            <MentorCard
              key={match.mentor.id}
              match={match}
              rank={i + 1}
              booking={state.booking}
              onPick={(day, time) => patch({ booking: { mentor: match.mentor, day, time } })}
            />
          ))}
        </ul>
      )}

      <p className="text-sm text-muted">
        Want more options?{" "}
        <Link href="/discover" className="font-medium text-primary-text underline-offset-4 hover:underline">
          Browse every mentor in Discover
        </Link>
        .
      </p>

      <StepActions
        onBack={nav.back}
        onContinue={() => nav.next()}
        continueLabel={state.booking ? `Request ${state.booking.day} ${state.booking.time}` : "Finish — I'll book later"}
      />
    </div>
  );
}
