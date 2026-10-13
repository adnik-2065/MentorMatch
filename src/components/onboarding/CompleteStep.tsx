"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, StepHeading } from "@/components/ui";
import { IconArrowRight, IconCheck, IconHourglass, IconShield } from "@/components/icons";
import { analyseRepos, type OnboardingState } from "@/lib/onboarding";
import { saveProfile, syncProfile, type SyncResult } from "@/lib/account";
import { hasPlacementGoals } from "@/lib/placement";

type SyncStatus = { status: "saving" } | SyncResult;

/** Tells the user exactly where their profile ended up — never claims a save that didn't happen. */
function SyncCard({ sync, isMentor, onRetry }: { sync: SyncStatus; isMentor: boolean; onRetry: () => void }) {
  const copy = {
    saving: { tone: "bg-inset", title: "Saving your profile…", body: "" },
    saved: {
      tone: "border-success/30 bg-success-soft",
      title: "Profile saved to MentorMatch",
      body: isMentor
        ? "Students can now find you by subject and by the experience you listed."
        : "Your subjects and placement goals are stored with your account on this browser.",
    },
    unavailable: {
      tone: "bg-inset",
      title: "Saved on this device only",
      body: "Profile storage isn't configured on this server, so nothing was sent to a database.",
    },
    invalid: { tone: "border-danger/30 bg-danger-soft", title: "The server rejected part of your profile", body: "" },
    error: { tone: "border-danger/30 bg-danger-soft", title: "Couldn't save to the server", body: "" },
  }[sync.status];

  return (
    <div role="status" className={`rounded-2xl border border-line p-5 ${copy.tone}`}>
      <p className="text-sm font-medium text-fg">{copy.title}</p>
      {copy.body && <p className="mt-1 text-sm text-muted">{copy.body}</p>}
      {sync.status === "error" && <p className="mt-1 text-sm text-muted">{sync.message} Your profile is still saved in this browser.</p>}
      {sync.status === "invalid" && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {Object.values(sync.errors).map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {(sync.status === "error" || sync.status === "invalid") && (
        <div className="mt-3">
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function CompleteStep({ state, onReset }: { state: OnboardingState; onReset: () => void }) {
  const isMentor = state.role === "mentor";

  const [sync, setSync] = useState<SyncStatus>({ status: "saving" });

  const save = useCallback(() => {
    setSync({ status: "saving" });
    syncProfile(state).then(setSync);
  }, [state]);

  // Reaching this step is what creates the account — the dashboards read the browser copy,
  // and the server copy is what other users are matched against.
  useEffect(() => {
    saveProfile(state);
    save();
  }, [state, save]);

  const firstName = state.name.trim().split(" ")[0] || "there";
  const slotCount = Object.values(state.availability).flat().length;
  const badges = state.proofStatus === "done" ? analyseRepos(state.teachTopics) : [];

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-3">
        <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-surface">
          <IconCheck className="h-5 w-5" />
        </span>
        <StepHeading
          title={`You're set up, ${firstName}`}
          subtitle={
            isMentor
              ? "Your mentor profile and weekly availability are ready to preview."
              : "Your learning workspace is ready, with matches tailored to your subjects."
          }
        />
      </div>

      <SyncCard sync={sync} isMentor={isMentor} onRetry={save} />

      {!isMentor && hasPlacementGoals(state) && (
        <Card className="bg-inset">
          <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Placement goals</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
            {state.targetCompanies.length > 0 && (
              <>
                <dt className="text-faint">Companies</dt>
                <dd className="text-fg">{state.targetCompanies.join(", ")}</dd>
              </>
            )}
            {state.targetRoles.length > 0 && (
              <>
                <dt className="text-faint">Positions</dt>
                <dd className="text-fg">{state.targetRoles.join(", ")}</dd>
              </>
            )}
            {state.placementSeason && (
              <>
                <dt className="text-faint">Season</dt>
                <dd className="text-fg">{state.placementSeason}</dd>
              </>
            )}
          </dl>
          <p className="mt-3 text-xs text-faint">Edit these any time from Discover.</p>
        </Card>
      )}

      {!isMentor && state.booking && (
        <Card className="border-warning/30 bg-warning-soft">
          <Badge tone="warning">
            <IconHourglass className="h-3 w-3" />
            Request sent
          </Badge>
          <p className="mt-3 font-sans text-xl font-semibold text-fg">
            {state.booking.day}, {state.booking.time} · {state.booking.mentor.name}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {state.triage?.topic ?? state.learnTopics[0]} — {state.triage?.concept}
          </p>
          <p className="mt-3 max-w-[58ch] text-xs leading-relaxed text-faint">
            {state.booking.mentor.name.split(" ")[0]} has to accept before the session is on. The
            slot is held for you until then, and the room opens the moment they say yes — it&apos;s
            on your dashboard either way.
          </p>
        </Card>
      )}

      {!isMentor && !state.booking && (
        <Card className="bg-inset">
          <p className="text-sm font-medium text-fg">No session booked yet.</p>
          <p className="mt-1 text-sm text-muted">
            Head to Discover and pick a slot whenever you&apos;re ready.
          </p>
        </Card>
      )}

      {isMentor && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Your skills</h3>
            <ul className="mt-3.5 space-y-2.5">
              {state.teachTopics.map((topic) => {
                const badge = badges.find((b) => b.topic === topic);
                return (
                  <li key={topic} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-fg">{topic}</span>
                    {badge ? (
                      <Badge tone={badge.confidence === "High" ? "success" : "warning"}>
                        <IconShield className="h-3 w-3" />
                        {badge.confidence}
                      </Badge>
                    ) : (
                      <Badge>Self-claimed</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h3 className="text-xs font-medium tracking-wide text-faint uppercase">
              Your availability
            </h3>
            <p className="mt-3 font-sans text-3xl font-semibold tabular-nums text-fg">
              {slotCount}
            </p>
            <p className="text-sm text-muted">bookable slots per week</p>
            <p className="mt-3 text-xs leading-relaxed text-faint">
              {Object.entries(state.availability)
                .filter(([, hours]) => hours.length > 0)
                .map(([day, hours]) => `${day} ${hours.length}h`)
                .join(" · ") || "None published"}
            </p>
          </Card>
        </div>
      )}

      <Card className="bg-inset">
        <h3 className="text-xs font-medium tracking-wide text-faint uppercase">
          What happens next
        </h3>
        <ul className="mt-3.5 space-y-2.5 text-sm leading-relaxed text-muted">
          {(isMentor
            ? [
                "Your subjects and availability now shape your mentor dashboard.",
                "Your profile is ready for the matching experience.",
                "Requests and chat can be connected when the backend is added.",
              ]
            : [
                "Once the senior accepts, your room opens in chat — before the slot, not at it.",
                "You'll rate the session afterwards; that unlocks your next booking.",
                "An AI recap with practice tasks lands in your notes vault.",
              ]
          ).map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <span className="mt-1 text-primary-text">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
              {line}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={isMentor ? "/mentor" : "/dashboard"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Go to dashboard
          <IconArrowRight />
        </Link>
        <Button variant="ghost" onClick={onReset}>
          Restart demo
        </Button>
      </div>
    </div>
  );
}
