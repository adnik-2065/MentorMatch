"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconPlus, IconRoute, IconSparkle, IconTeach } from "@/components/icons";
import { EmptyState, Section } from "@/components/dashboard/Shell";
import { api, ApiError, useApi } from "@/lib/roadmap/client";
import { levelLabel } from "@/lib/roadmap/schemas";
import type { PendingRequest, RoadmapSummary } from "@/lib/roadmap/types";
import { AccountGate } from "./AccountGate";
import { ErrorState, InlineError, ProgressBar, Skeleton, dateLabel, focus, primaryLink, quietButton } from "./bits";

export function RoadmapList() {
  return <AccountGate role="student">{() => <Roadmaps />}</AccountGate>;
}

function Roadmaps() {
  const { data, error, loading, reload } = useApi<{ roadmaps: RoadmapSummary[]; pending: PendingRequest[] }>(
    "/api/roadmaps",
  );
  const [showArchived, setShowArchived] = useState(false);

  const active = data?.roadmaps.filter((r) => r.status === "ACTIVE") ?? [];
  const archived = data?.roadmaps.filter((r) => r.status === "ARCHIVED") ?? [];

  return (
    <>
      <Link href="/dashboard" className={`${quietButton} -ml-3`}>
        <IconArrowLeft />
        Dashboard
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-fg sm:text-3xl">My learning roadmaps</h1>
          <p className="mt-1.5 max-w-[60ch] text-sm text-muted">
            Week-by-week plans built around your level, your goal and the hours you actually have.
          </p>
        </div>
        <Link href="/dashboard/roadmaps/new" className={primaryLink}>
          <IconPlus />
          Create roadmap
        </Link>
      </div>

      <div className="mt-8">
        {loading && !data ? (
          <div role="status" aria-label="Loading roadmaps" className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Your roadmaps didn't load" body={error.message} onRetry={reload} />
        ) : (
          <>
            {data!.pending.length > 0 && (
              <Section title="Waiting on the AI">
                <div className="space-y-3">
                  {data!.pending.map((p) => (
                    <PendingCard key={p.id} request={p} onChange={reload} />
                  ))}
                </div>
              </Section>
            )}

            <Section
              title="Active"
              action={active.length > 0 ? <span className="text-xs text-faint">{active.length} in progress</span> : undefined}
            >
              {active.length === 0 ? (
                <EmptyState
                  title="No roadmaps yet"
                  body="Tell us the skill, where you're starting and how much time you have. You'll get a plan with weekly tasks, checkpoints and a final project."
                  action={
                    <Link href="/dashboard/roadmaps/new" className={primaryLink}>
                      <IconSparkle />
                      Create your first roadmap
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {active.map((r) => (
                    <RoadmapCard key={r.id} roadmap={r} />
                  ))}
                </div>
              )}
            </Section>

            {archived.length > 0 && (
              <Section title="Previous versions">
                <button
                  type="button"
                  aria-expanded={showArchived}
                  onClick={() => setShowArchived((v) => !v)}
                  className={`${quietButton} -ml-3`}
                >
                  {showArchived ? "Hide" : "Show"} {archived.length} archived roadmap{archived.length === 1 ? "" : "s"}
                </button>
                {showArchived && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {archived.map((r) => (
                      <RoadmapCard key={r.id} roadmap={r} />
                    ))}
                  </div>
                )}
              </Section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function RoadmapCard({ roadmap: r }: { roadmap: RoadmapSummary }) {
  const p = r.progress;
  return (
    <Link
      href={`/dashboard/roadmaps/${r.id}`}
      className={`group block rounded-xl border border-line bg-surface p-5 transition-colors duration-200 hover:border-primary ${focus}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">
          <IconRoute className="h-3 w-3" />
          {r.skill}
        </Badge>
        {r.status === "ARCHIVED" && <Badge>Archived {r.archivedAt ? dateLabel(r.archivedAt) : ""}</Badge>}
        {r.pendingSuggestions > 0 && <Badge tone="warning">{r.pendingSuggestions} to review</Badge>}
        {p.complete && <Badge tone="success">Complete</Badge>}
      </div>

      <h3 className="mt-3 font-sans text-base font-semibold text-fg">{r.title}</h3>
      <p className="mt-1 text-xs text-faint">
        {levelLabel(r.currentLevel)} → {levelLabel(r.targetLevel)} · {r.durationWeeks} weeks · {r.hoursPerWeek} h/week
      </p>

      <div className="mt-4 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted">
          {p.complete ? "All milestones done" : p.currentWeek ? `On week ${p.currentWeek} of ${r.durationWeeks}` : "Not started"}
        </span>
        <span className="font-medium tabular-nums text-fg">{p.percent}%</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={p.percent} label={`${r.title} progress`} />
      </div>
      <p className="mt-2 text-xs text-faint">
        {p.completedTasks} of {p.totalTasks} tasks · {p.completedMilestones} of {p.totalMilestones} milestones
      </p>

      {r.mentors.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <IconTeach className="h-3.5 w-3.5" />
          Shared with {r.mentors.map((m) => m.name).join(", ")}
        </p>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary-text">
        Open roadmap
        <IconArrowRight />
      </p>
    </Link>
  );
}

function PendingCard({ request, onChange }: { request: PendingRequest; onChange: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(request.status === "GENERATING");
  const [error, setError] = useState<string | null>(null);

  const retry = async () => {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>(`/api/roadmap-requests/${request.id}/generate`, { method: "POST" });
      router.push(`/dashboard/roadmaps/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Generation failed.");
      setBusy(false);
      onChange();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-5">
      <div className="min-w-0">
        <p className="font-sans text-sm font-semibold text-fg">{request.skill}</p>
        <p className="mt-1 text-sm text-muted">
          {busy
            ? "Being generated — this can take a couple of minutes."
            : (request.lastError ?? "Your answers are saved but the roadmap hasn't been generated yet.")}
        </p>
        <InlineError message={error} />
      </div>
      <Button onClick={retry} disabled={busy}>
        {busy ? "Generating…" : "Generate now"}
      </Button>
    </div>
  );
}
