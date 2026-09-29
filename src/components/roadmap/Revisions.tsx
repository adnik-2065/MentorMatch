"use client";

import { useState } from "react";
import { Badge, Button, Card, Textarea } from "@/components/ui";
import { IconCheck, IconClose, IconSparkle, IconTeach } from "@/components/icons";
import { api, ApiError } from "@/lib/roadmap/client";
import type { RevisionChange } from "@/lib/roadmap/schemas";
import type { MilestoneView, RevisionView } from "@/lib/roadmap/types";
import { ExternalLink, InlineError, dateLabel, focus } from "./bits";

const RECOMMENDATION_LABEL: Record<string, string> = {
  practice: "Practice",
  prerequisite_review: "Revisit first",
  alternative_explanation: "Another way to see it",
  mentor_session: "Mentor session",
  pacing: "Pacing",
};

const EVIDENCE_NOTE = {
  limited: "Based on limited evidence — treat these as hints, not conclusions.",
  moderate: "Based on a reasonable amount of evidence.",
  strong: "Backed by consistent evidence across your work.",
};

export function describeChange(change: RevisionChange, milestones: MilestoneView[]) {
  const m = milestones.find((x) => x.position === change.milestonePosition);
  const where = m ? `${m.title} (milestone ${m.position})` : `Milestone ${change.milestonePosition}`;
  switch (change.op) {
    case "add_task":
      return `${where}: add ${change.kind === "ASSIGNMENT" ? "an assignment" : "a practice task"} — “${change.title}”`;
    case "add_resource":
      return `${where}: add resource — “${change.resource.title}”`;
    case "update_milestone": {
      const parts = [
        change.title && `rename to “${change.title}”`,
        change.summary && "rewrite the summary",
        change.estimatedHours && `set time to ~${change.estimatedHours} h`,
        change.addObjectives?.length && `add ${change.addObjectives.length} objective(s)`,
        change.addTopics?.length && `add topics: ${change.addTopics.map((t) => t.name).join(", ")}`,
      ].filter(Boolean);
      return `${where}: ${parts.join("; ")}`;
    }
  }
}

/** One suggestion, with its reasoning. Nothing applies until the learner says so. */
export function RevisionCard({
  roadmapId,
  revision: r,
  milestones,
  canDecide,
  onDecided,
  mentorView = false,
}: {
  roadmapId: string;
  revision: RevisionView;
  milestones: MilestoneView[];
  canDecide: boolean;
  onDecided: () => void;
  /** Wording for the mentor reading the learner's suggestions. */
  mentorView?: boolean;
}) {
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "accept" | "reject") => {
    setBusy(decision);
    setError(null);
    try {
      await api(`/api/roadmaps/${roadmapId}/revisions/${r.id}`, { method: "POST", body: { decision } });
      onDecided();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That didn't go through.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className={r.status === "PENDING" ? "border-warning/40" : ""}>
      <div className="flex flex-wrap items-center gap-2">
        {r.source === "MENTOR" ? (
          <Badge tone="primary">
            <IconTeach className="h-3 w-3" />
            {r.proposedBy.name}
          </Badge>
        ) : (
          <Badge tone="primary">
            <IconSparkle className="h-3 w-3" />
            AI coach
          </Badge>
        )}
        {r.status === "PENDING" && <Badge tone="warning">{mentorView ? "Awaiting learner" : "Waiting for you"}</Badge>}
        {r.status === "ACCEPTED" && <Badge tone="success">Accepted · v{r.appliedVersion}</Badge>}
        {r.status === "REJECTED" && <Badge>{r.changes.length ? "Rejected" : "Read"}</Badge>}
        <span className="ml-auto text-xs text-faint">{dateLabel(r.createdAt)}</span>
      </div>

      <h3 className="mt-3 font-sans text-base font-semibold text-fg">{r.summary}</h3>
      {r.learnerFeedback && (
        <p className="mt-2 border-l-2 border-line pl-3 text-sm italic text-muted">You said: “{r.learnerFeedback}”</p>
      )}
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted">{r.rationale}</p>
      {r.evidence && <p className="mt-1.5 text-xs text-faint">{EVIDENCE_NOTE[r.evidence]}</p>}

      {r.recommendations.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium tracking-wide text-faint uppercase">Suggestions — no approval needed</h4>
          <ul className="mt-2 space-y-2.5">
            {r.recommendations.map((rec, i) => (
              <li key={i} className="text-sm">
                <Badge>{RECOMMENDATION_LABEL[rec.type] ?? rec.type}</Badge>{" "}
                <span className="font-medium text-fg">{rec.title}</span>
                <p className="mt-1 leading-relaxed text-muted">{rec.detail}</p>
                {rec.type === "mentor_session" && (
                  <p className="mt-1 text-xs text-faint">
                    {rec.bookingHref ? (
                      <ExternalLink href={rec.bookingHref}>Book a session</ExternalLink>
                    ) : mentorView ? (
                      "Worth offering — booking from roadmaps isn't live yet, so suggest a time with a session note."
                    ) : (
                      "Share this roadmap with a mentor below and mention this — booking from roadmaps isn't live yet."
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.changes.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium tracking-wide text-faint uppercase">
            {mentorView ? "Changes to the plan" : "Changes to your plan"}{" "}
            {r.status === "PENDING" ? (mentorView ? "— applied only if the learner accepts" : "— applied only if you accept") : ""}
          </h4>
          <ul className="mt-2 space-y-1.5">
            {r.changes.map((c, i) => (
              <li key={i} className="text-sm leading-relaxed text-fg">
                • {describeChange(c, milestones)}
                {c.reason && <span className="text-muted"> — {c.reason}</span>}
              </li>
            ))}
          </ul>
          {r.status === "PENDING" && (
            <p className="mt-2 text-xs text-faint">
              Accepting only adds to or adjusts unfinished milestones. Completed tasks and your notes are never touched.
            </p>
          )}
        </div>
      )}

      {r.status === "PENDING" && canDecide && (
        <div className="mt-5 space-y-2">
          <InlineError message={error} />
          <div className="flex flex-wrap gap-3">
            {r.changes.length > 0 ? (
              <>
                <Button onClick={() => decide("accept")} disabled={busy !== null}>
                  <IconCheck />
                  {busy === "accept" ? "Applying…" : "Accept changes"}
                </Button>
                <Button variant="outline" onClick={() => decide("reject")} disabled={busy !== null}>
                  <IconClose />
                  {busy === "reject" ? "Rejecting…" : "Reject"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => decide("reject")} disabled={busy !== null}>
                Mark as read
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/** Where a learner asks the adaptive coach for help. */
export function CheckInPanel({
  roadmapId,
  milestones,
  currentMilestone,
  preset,
  onCreated,
}: {
  roadmapId: string;
  milestones: MilestoneView[];
  currentMilestone: number | null;
  preset: { attemptId?: string; milestoneId?: string } | null;
  onCreated: () => void;
}) {
  const fallback = milestones.find((m) => m.position === currentMilestone)?.id ?? milestones[0]?.id ?? "";
  const [milestoneId, setMilestoneId] = useState(preset?.milestoneId ?? fallback);
  const [difficulties, setDifficulties] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/roadmaps/${roadmapId}/adaptive`, {
        method: "POST",
        body: {
          milestoneId: milestoneId || undefined,
          attemptId: preset?.attemptId,
          difficulties,
        },
      });
      setDifficulties("");
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? (e.fields.difficulties?.[0] ?? e.message) : "Couldn't reach the coach.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="check-in" className="scroll-mt-24">
      <Card className="space-y-4">
        <div>
          <h2 className="font-sans text-base font-semibold text-fg">Stuck? Ask the coach</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {preset?.attemptId
              ? "Your quiz result is attached. Add what felt hard and you'll get suggestions to review."
              : "Describe what's hard. You'll get suggestions to review — your roadmap doesn't change unless you accept."}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="checkin-milestone" className="block text-sm font-medium text-fg">
            Which part?
          </label>
          <select
            id="checkin-milestone"
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
            className={`min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg ${focus}`}
          >
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.position}. {m.title}
              </option>
            ))}
          </select>
        </div>

        <Textarea
          id="checkin-difficulties"
          label="What's hard right now?"
          rows={3}
          maxLength={2000}
          placeholder="e.g. I can run containers, but I don't get when to use a bind mount vs a volume."
          value={difficulties}
          onChange={(e) => setDifficulties(e.target.value)}
        />

        <InlineError message={error} />
        <Button onClick={submit} disabled={busy || (!preset?.attemptId && difficulties.trim().length < 10)}>
          <IconSparkle />
          {busy ? "Thinking… (up to a minute)" : "Get suggestions"}
        </Button>
      </Card>
    </div>
  );
}
