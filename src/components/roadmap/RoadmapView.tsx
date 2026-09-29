"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconCalendar, IconCheck, IconRoute, IconSparkle, IconTrend } from "@/components/icons";
import { EmptyState, Section, StatTile } from "@/components/dashboard/Shell";
import { api, ApiError, useApi } from "@/lib/roadmap/client";
import { levelLabel, styleLabel } from "@/lib/roadmap/schemas";
import type { RoadmapDetail, TaskView } from "@/lib/roadmap/types";
import { AccountGate } from "./AccountGate";
import { ErrorState, InlineError, List, PageSkeleton, ProgressBar, dateLabel, focus, outlineLink, quietButton } from "./bits";
import { MilestoneCard } from "./MilestoneCard";
import { QuizPanel } from "./QuizPanel";
import { CheckInPanel, RevisionCard } from "./Revisions";
import { MentorNotes, SharePanel } from "./Sharing";

export function RoadmapView({ id }: { id: string }) {
  return <AccountGate role="student">{() => <Roadmap id={id} />}</AccountGate>;
}

function Roadmap({ id }: { id: string }) {
  const { data, error, loading, reload, setData } = useApi<{ roadmap: RoadmapDetail }>(`/api/roadmaps/${id}`);
  const [checkIn, setCheckIn] = useState<{ attemptId?: string; milestoneId?: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return error.status === 404 ? (
      <EmptyState
        title="Roadmap not found"
        body="It may have been deleted, or it belongs to someone else."
        action={
          <Link href="/dashboard/roadmaps" className={outlineLink}>
            Back to my roadmaps
          </Link>
        }
      />
    ) : (
      <ErrorState title="This roadmap didn't load" body={error.message} onRetry={reload} />
    );
  }

  const r = data!.roadmap;
  const editable = r.viewer === "owner" && r.status === "ACTIVE";
  const p = r.progress;
  const pending = r.revisions.filter((rev) => rev.status === "PENDING");
  const decided = r.revisions.filter((rev) => rev.status !== "PENDING");

  // Optimistic tick, then re-read so progress always comes from the server.
  const toggle = async (task: TaskView, completed: boolean) => {
    const previous = data!;
    setData({
      roadmap: {
        ...r,
        milestones: r.milestones.map((m) => ({
          ...m,
          tasks: m.tasks.map((t) => (t.id === task.id ? { ...t, completedAt: completed ? new Date().toISOString() : null } : t)),
        })),
      },
    });
    try {
      await api(`/api/roadmaps/${r.id}/tasks/${task.id}`, { method: "PATCH", body: { completed } });
    } catch (e) {
      setData(previous);
      throw e;
    } finally {
      void reload();
    }
  };

  const saveNote = async (task: TaskView, note: string) => {
    await api(`/api/roadmaps/${r.id}/tasks/${task.id}`, { method: "PATCH", body: { note } });
    await reload();
  };

  const askForHelp = (attemptId: string | undefined, milestoneId: string | undefined) => {
    setCheckIn({ attemptId, milestoneId });
    requestAnimationFrame(() => document.getElementById("check-in")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      <Link href="/dashboard/roadmaps" className={`${quietButton} -ml-3`}>
        <IconArrowLeft />
        My roadmaps
      </Link>

      {r.status === "ARCHIVED" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft/50 p-4">
          <p className="text-sm text-fg">
            This is an archived version from {dateLabel(r.createdAt)}. It&apos;s kept read-only so you don&apos;t lose your history.
          </p>
          {r.nextRoadmapId && (
            <Link href={`/dashboard/roadmaps/${r.nextRoadmapId}`} className={outlineLink}>
              Open the newer version
              <IconArrowRight />
            </Link>
          )}
        </div>
      )}

      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            <IconRoute className="h-3 w-3" />
            {r.skill}
          </Badge>
          <Badge>
            {levelLabel(r.currentLevel)} → {levelLabel(r.targetLevel)}
          </Badge>
          {r.version > 1 && <Badge>Revised · v{r.version}</Badge>}
        </div>
        <h1 className="mt-3 max-w-[30ch] font-sans text-2xl font-semibold text-fg sm:text-3xl">{r.title}</h1>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted">{r.description}</p>
        <p className="mt-2 text-xs text-faint">
          {r.estimatedDuration} · {r.weeklyCommitment} · {styleLabel(r.learningStyle)} · started {dateLabel(r.startedAt)}
        </p>
      </header>

      <Section title="Progress">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Overall" value={`${p.percent}%`} hint={p.complete ? "all done" : "of tasks complete"} icon={<IconTrend className="h-3.5 w-3.5" />} />
          <StatTile label="Tasks" value={`${p.completedTasks}/${p.totalTasks}`} hint="completed" icon={<IconCheck className="h-3.5 w-3.5" />} />
          <StatTile
            label="Milestones"
            value={`${p.completedMilestones}/${p.totalMilestones}`}
            hint="fully finished"
            icon={<IconRoute className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Current week"
            value={p.complete ? "Done" : p.currentWeek ? `${p.currentWeek}` : "—"}
            hint={`calendar says week ${p.scheduledWeek} of ${r.durationWeeks}`}
            icon={<IconCalendar className="h-3.5 w-3.5" />}
          />
        </div>
        <div className="mt-4">
          <ProgressBar value={p.percent} label="Roadmap progress" />
        </div>
      </Section>

      {pending.length > 0 && (
        <Section title="Suggestions to review" action={<span className="text-xs text-faint">Nothing changes until you accept</span>}>
          <div className="space-y-3">
            {pending.map((rev) => (
              <RevisionCard key={rev.id} roadmapId={r.id} revision={rev} milestones={r.milestones} canDecide={editable} onDecided={reload} />
            ))}
          </div>
        </Section>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="timeline-heading" className="min-w-0">
          <h2 id="timeline-heading" className="mb-3.5 font-sans text-base font-semibold text-fg">
            Weekly plan
          </h2>
          <ol className="space-y-4">
            {r.milestones.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                current={m.position === p.currentMilestone}
                defaultOpen={m.position === (p.currentMilestone ?? 1)}
                feedback={r.feedback}
                actions={editable ? { onToggle: toggle, onSaveNote: saveNote } : undefined}
                quiz={
                  <QuizPanel
                    roadmapId={r.id}
                    milestone={m}
                    editable={editable}
                    onSubmitted={reload}
                    onAskForHelp={(attemptId, milestoneId) => askForHelp(attemptId, milestoneId)}
                  />
                }
              />
            ))}
          </ol>

          <Card className="mt-6">
            <Badge tone="primary">Final outcome</Badge>
            <h3 className="mt-3 font-sans text-base font-semibold text-fg">{r.capstone.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.capstone.description}</p>
            <div className="mt-4 grid gap-5 md:grid-cols-3">
              {r.capstone.deliverables.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium tracking-wide text-faint uppercase">Deliverables</h4>
                  <List items={r.capstone.deliverables} className="mt-2" />
                </div>
              )}
              <div>
                <h4 className="text-xs font-medium tracking-wide text-faint uppercase">You&apos;ll demonstrate</h4>
                <List items={r.capstone.skillsDemonstrated} className="mt-2" />
              </div>
              <div>
                <h4 className="text-xs font-medium tracking-wide text-faint uppercase">Success looks like</h4>
                <List items={r.capstone.successCriteria} className="mt-2" />
              </div>
            </div>
          </Card>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {editable && (
            <CheckInPanel
              key={`${checkIn?.attemptId ?? ""}-${checkIn?.milestoneId ?? ""}`}
              roadmapId={r.id}
              milestones={r.milestones}
              currentMilestone={p.currentMilestone}
              preset={checkIn}
              onCreated={() => {
                setCheckIn(null);
                void reload();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

          <SharePanel roadmapId={r.id} skill={r.skill} shares={r.shares ?? []} editable={editable} onChange={reload} />

          {r.feedback.some((f) => f.kind !== "TASK") && (
            <div>
              <h2 className="mb-2 font-sans text-sm font-semibold text-fg">From your mentor</h2>
              <MentorNotes feedback={r.feedback} />
            </div>
          )}

          <Card className="space-y-2">
            <h2 className="font-sans text-sm font-semibold text-fg">Your goal</h2>
            <p className="text-sm leading-relaxed text-muted">{r.goal}</p>
            {r.focusTopics.length > 0 && <p className="text-xs text-faint">Focus: {r.focusTopics.join(", ")}</p>}
            <p className="pt-2 text-xs text-faint">
              <IconSparkle className="mr-1 inline h-3 w-3" />
              Generated by AI ({r.aiModel}). Treat it as a starting plan — your mentor can help adjust it.
            </p>
          </Card>

          {r.viewer === "owner" && r.status === "ACTIVE" && <ManageRoadmap roadmap={r} />}
        </aside>
      </div>

      {decided.length > 0 && (
        <Section title="History">
          <button type="button" aria-expanded={showHistory} onClick={() => setShowHistory((v) => !v)} className={`${quietButton} -ml-3`}>
            {showHistory ? "Hide" : "Show"} {decided.length} past suggestion{decided.length === 1 ? "" : "s"}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3">
              {decided.map((rev) => (
                <RevisionCard key={rev.id} roadmapId={r.id} revision={rev} milestones={r.milestones} canDecide={false} onDecided={reload} />
              ))}
            </div>
          )}
        </Section>
      )}
    </>
  );
}

/** Regenerate or delete — both behind an explicit confirmation. */
function ManageRoadmap({ roadmap: r }: { roadmap: RoadmapDetail }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "regenerate" | "delete">("idle");
  const [deletePrevious, setDeletePrevious] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>(`/api/roadmaps/${r.id}/regenerate`, {
        method: "POST",
        body: { deletePrevious, confirm: deletePrevious || undefined },
      });
      router.push(`/dashboard/roadmaps/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Regeneration failed.");
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/roadmaps/${r.id}`, { method: "DELETE", body: { confirm: true } });
      router.push("/dashboard/roadmaps");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete.");
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-sans text-sm font-semibold text-fg">Manage</h2>

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setMode("regenerate")}>
            Regenerate
          </Button>
          <Button variant="ghost" onClick={() => setMode("delete")}>
            Delete
          </Button>
        </div>
      )}

      {mode === "regenerate" && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted">
            Builds a fresh plan from the same answers. This version is archived — with its progress — unless you choose to
            delete it. Mentors you&apos;ve shared with keep access to the new one.
          </p>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-fg">
            <input
              type="checkbox"
              checked={deletePrevious}
              onChange={(e) => setDeletePrevious(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--danger)]"
            />
            <span>
              Delete this version and its {r.progress.completedTasks} completed task{r.progress.completedTasks === 1 ? "" : "s"}{" "}
              permanently
            </span>
          </label>
          <InlineError message={error} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={regenerate} disabled={busy}>
              {busy ? "Generating… (1–2 minutes)" : deletePrevious ? "Delete and regenerate" : "Archive and regenerate"}
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "delete" && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted">
            Permanently deletes this roadmap, its progress, notes, quiz attempts and mentor feedback. This can&apos;t be undone.
          </p>
          <InlineError message={error} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-danger px-5 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-45 ${focus}`}
            >
              {busy ? "Deleting…" : "Yes, delete permanently"}
            </button>
            <Button variant="ghost" onClick={() => setMode("idle")} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
