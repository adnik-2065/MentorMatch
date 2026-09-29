"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconCheck, IconMessage, IconRoute } from "@/components/icons";
import { EmptyState, Section } from "@/components/dashboard/Shell";
import { api, ApiError, useApi } from "@/lib/roadmap/client";
import { RESOURCE_TYPES, levelLabel, type RevisionChange } from "@/lib/roadmap/schemas";
import type { MilestoneView, RoadmapDetail, SharedRoadmapSummary, TaskView } from "@/lib/roadmap/types";
import { AccountGate } from "./AccountGate";
import { ErrorState, FieldError, InlineError, PageSkeleton, ProgressBar, Skeleton, dateLabel, focus, outlineLink, quietButton } from "./bits";
import { MilestoneCard } from "./MilestoneCard";
import { RevisionCard } from "./Revisions";
import { MentorNotes } from "./Sharing";

/* ──────────────────────────────── list ──────────────────────────────── */

export function MentorRoadmapList() {
  return <AccountGate role="mentor">{() => <SharedList />}</AccountGate>;
}

function SharedList() {
  const { data, error, loading, reload } = useApi<{ roadmaps: SharedRoadmapSummary[] }>("/api/mentor/roadmaps");
  const active = data?.roadmaps.filter((r) => r.status === "ACTIVE") ?? [];

  return (
    <>
      <Link href="/mentor" className={`${quietButton} -ml-3`}>
        <IconArrowLeft />
        Mentoring
      </Link>
      <h1 className="mt-2 font-sans text-2xl font-semibold text-fg sm:text-3xl">Roadmaps shared with you</h1>
      <p className="mt-1.5 max-w-[60ch] text-sm text-muted">
        Learners share these so you can review their plan, comment on their work and suggest changes. They approve anything
        that changes the plan.
      </p>

      <div className="mt-8">
        {loading && !data ? (
          <div role="status" aria-label="Loading" className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : error ? (
          <ErrorState title="Shared roadmaps didn't load" body={error.message} onRetry={reload} />
        ) : active.length === 0 ? (
          <EmptyState
            title="Nothing shared with you yet"
            body="When a learner connects you to their roadmap from their dashboard, it shows up here."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((r) => (
              <Link
                key={r.id}
                href={`/mentor/roadmaps/${r.id}`}
                className={`block rounded-xl border border-line bg-surface p-5 transition-colors duration-200 hover:border-primary ${focus}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-sans text-sm font-semibold text-fg">{r.learner.name || "A learner"}</span>
                  <span className="text-xs text-faint">{[r.learner.year, r.learner.branch].filter(Boolean).join(" ")}</span>
                  {r.pendingSuggestions > 0 && <Badge tone="warning">{r.pendingSuggestions} awaiting learner</Badge>}
                </div>
                <h2 className="mt-2 font-sans text-base font-semibold text-fg">{r.title}</h2>
                <p className="mt-1 text-xs text-faint">
                  {r.skill} · {levelLabel(r.currentLevel)} → {levelLabel(r.targetLevel)} · {r.durationWeeks} weeks
                </p>
                <div className="mt-4 flex justify-between text-xs">
                  <span className="text-muted">{r.progress.currentWeek ? `On week ${r.progress.currentWeek}` : "Finished"}</span>
                  <span className="font-medium tabular-nums text-fg">{r.progress.percent}%</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={r.progress.percent} label={`${r.learner.name} progress`} />
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary-text">
                  Review
                  <IconArrowRight />
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ──────────────────────────────── detail ────────────────────────────── */

export function MentorRoadmapView({ id }: { id: string }) {
  return <AccountGate role="mentor">{() => <Review id={id} />}</AccountGate>;
}

function Review({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi<{ roadmap: RoadmapDetail }>(`/api/roadmaps/${id}`);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return error.status === 404 ? (
      <EmptyState
        title="You don't have access to this roadmap"
        body="The learner may have stopped sharing it, or the link is wrong."
        action={
          <Link href="/mentor/roadmaps" className={outlineLink}>
            Shared roadmaps
          </Link>
        }
      />
    ) : (
      <ErrorState title="This roadmap didn't load" body={error.message} onRetry={reload} />
    );
  }

  const r = data!.roadmap;
  const active = r.status === "ACTIVE";
  const p = r.progress;

  return (
    <>
      <Link href="/mentor/roadmaps" className={`${quietButton} -ml-3`}>
        <IconArrowLeft />
        Shared roadmaps
      </Link>

      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            <IconRoute className="h-3 w-3" />
            {r.skill}
          </Badge>
          <Badge>{r.learner.name || "Learner"}</Badge>
          {!active && <Badge tone="warning">Archived version</Badge>}
        </div>
        <h1 className="mt-3 font-sans text-2xl font-semibold text-fg sm:text-3xl">{r.title}</h1>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted">{r.description}</p>
        <p className="mt-2 text-xs text-faint">
          {levelLabel(r.currentLevel)} → {levelLabel(r.targetLevel)} · {r.durationWeeks} weeks · {r.hoursPerWeek} h/week
        </p>
        <Card className="mt-4">
          <h2 className="text-xs font-medium tracking-wide text-faint uppercase">Their goal</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-fg">{r.goal}</p>
          <div className="mt-4 flex items-baseline justify-between text-xs">
            <span className="text-muted">
              {p.completedTasks}/{p.totalTasks} tasks · {p.completedMilestones}/{p.totalMilestones} milestones
            </span>
            <span className="font-medium tabular-nums text-fg">{p.percent}%</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={p.percent} label="Learner progress" />
          </div>
        </Card>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="plan-heading" className="min-w-0">
          <h2 id="plan-heading" className="mb-3.5 font-sans text-base font-semibold text-fg">
            Their plan
          </h2>
          <ol className="space-y-4">
            {r.milestones.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                current={m.position === p.currentMilestone}
                defaultOpen={m.position === (p.currentMilestone ?? 1)}
                feedback={r.feedback}
                quiz={<QuizReview milestone={m} />}
                taskFooter={active ? (task) => <TaskFeedback roadmapId={r.id} task={task} onSent={reload} /> : undefined}
              />
            ))}
          </ol>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {active && <ProposeChange roadmapId={r.id} milestones={r.milestones} onSent={reload} />}
          {active && <SendNote roadmapId={r.id} skill={r.skill} onSent={reload} />}
          {r.feedback.some((f) => f.kind !== "TASK") && (
            <div>
              <h2 className="mb-2 font-sans text-sm font-semibold text-fg">Your notes</h2>
              <MentorNotes feedback={r.feedback} />
            </div>
          )}
        </aside>
      </div>

      {r.revisions.length > 0 && (
        <Section title="Suggested changes">
          <div className="space-y-3">
            {r.revisions.map((rev) => (
              <RevisionCard key={rev.id} roadmapId={r.id} revision={rev} milestones={r.milestones} canDecide={false} onDecided={reload} mentorView />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/** Mentors see the answer key and recent scores, to review the checkpoint with the learner. */
function QuizReview({ milestone }: { milestone: MilestoneView }) {
  const [open, setOpen] = useState(false);
  if (milestone.quiz.questions.length === 0) return null;
  return (
    <section aria-label="Checkpoint quiz" className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium text-fg">Checkpoint quiz</h4>
        {milestone.attempts.map((a) => (
          <Badge key={a.id} tone={a.score / a.maxScore >= 0.7 ? "success" : "warning"}>
            {a.score}/{a.maxScore} · {dateLabel(a.createdAt)}
          </Badge>
        ))}
        {milestone.attempts.length === 0 && <span className="text-xs text-faint">Not attempted yet</span>}
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`${quietButton} ml-auto min-h-9`}>
          {open ? "Hide questions" : "Show questions"}
        </button>
      </div>
      {open && (
        <ol className="mt-3 space-y-3">
          {milestone.quiz.questions.map((q, i) => (
            <li key={i} className="text-sm">
              <p className="font-medium text-fg">
                {i + 1}. {q.question}
              </p>
              <ul className="mt-1 space-y-0.5 pl-4">
                {q.options.map((o, oi) => (
                  <li key={oi} className={oi === q.correctIndex ? "font-medium text-success" : "text-muted"}>
                    {oi === q.correctIndex && <IconCheck className="mr-1 inline h-3.5 w-3.5" />}
                    {o}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function useSend(onSent: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [sent, setSent] = useState(false);

  const send = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    setFields({});
    setSent(false);
    try {
      await api(path, { method: "POST", body });
      setSent(true);
      onSent();
      return true;
    } catch (e) {
      if (e instanceof ApiError) {
        setFields(e.fields);
        setError(e.message);
      } else setError("That didn't send.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, fields, sent, send };
}

function TaskFeedback({ roadmapId, task, onSent }: { roadmapId: string; task: TaskView; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const { busy, error, send } = useSend(onSent);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${quietButton} -ml-3 mt-1 min-h-9`}>
        <IconMessage className="h-3.5 w-3.5" />
        {task.completedAt ? "Give feedback on this" : "Comment"}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <label htmlFor={`fb-${task.id}`} className="sr-only">
        Feedback on {task.title}
      </label>
      <textarea
        id={`fb-${task.id}`}
        rows={3}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg ${focus}`}
      />
      <InlineError message={error} />
      <div className="flex gap-2">
        <Button
          disabled={busy || !body.trim()}
          onClick={async () => {
            if (await send(`/api/roadmaps/${roadmapId}/feedback`, { kind: "TASK", taskId: task.id, body })) {
              setBody("");
              setOpen(false);
            }
          }}
        >
          {busy ? "Sending…" : "Send"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function SendNote({ roadmapId, skill, onSent }: { roadmapId: string; skill: string; onSent: () => void }) {
  const [kind, setKind] = useState<"GENERAL" | "SESSION">("GENERAL");
  const [body, setBody] = useState("");
  const [sessionTopic, setSessionTopic] = useState("");
  const { busy, error, fields, sent, send } = useSend(onSent);

  return (
    <Card className="space-y-4">
      <h2 className="font-sans text-base font-semibold text-fg">Leave a note</h2>
      <div role="radiogroup" aria-label="Kind of note" className="flex flex-wrap gap-2">
        {(
          [
            ["GENERAL", "General feedback"],
            ["SESSION", "Recommend a session"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => setKind(value)}
            className={`inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 text-sm ${focus} ${
              kind === value ? "border-primary bg-primary-soft font-medium text-primary-text" : "border-line text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {kind === "SESSION" && (
        <div className="space-y-1">
          <Input
            id="session-topic"
            label="What should the session cover?"
            placeholder={`e.g. ${skill} — debugging together`}
            value={sessionTopic}
            maxLength={160}
            onChange={(e) => setSessionTopic(e.target.value)}
          />
          <FieldError id="session-topic-error" messages={fields.sessionTopic} />
        </div>
      )}
      <Textarea id="note-body" label="Message" rows={4} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
      <InlineError message={error} />
      {sent && <p className="text-sm text-success">Sent — it&apos;s on their roadmap now.</p>}
      <Button
        disabled={busy || !body.trim()}
        onClick={async () => {
          const ok = await send(`/api/roadmaps/${roadmapId}/feedback`, {
            kind,
            body,
            sessionTopic: kind === "SESSION" ? sessionTopic : undefined,
          });
          if (ok) {
            setBody("");
            setSessionTopic("");
          }
        }}
      >
        {busy ? "Sending…" : "Send"}
      </Button>
    </Card>
  );
}

/** Mentors can't edit the plan directly — they propose, the learner approves. */
function ProposeChange({ roadmapId, milestones, onSent }: { roadmapId: string; milestones: MilestoneView[]; onSent: () => void }) {
  const upcoming = milestones.filter((m) => !m.complete);
  const [op, setOp] = useState<RevisionChange["op"]>("add_task");
  const [position, setPosition] = useState(upcoming[0]?.position ?? 1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"ASSIGNMENT" | "EXERCISE">("ASSIGNMENT");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<(typeof RESOURCE_TYPES)[number]>("documentation");
  const [hours, setHours] = useState("");
  const [rationale, setRationale] = useState("");
  const { busy, error, sent, send } = useSend(onSent);

  if (upcoming.length === 0) {
    return (
      <Card>
        <h2 className="font-sans text-base font-semibold text-fg">Suggest a change</h2>
        <p className="mt-1 text-sm text-muted">Every milestone is finished — nothing left to adjust.</p>
      </Card>
    );
  }

  const change = (): RevisionChange | null => {
    switch (op) {
      case "add_task":
        return { op, milestonePosition: position, kind, title, description };
      case "add_resource":
        return { op, milestonePosition: position, resource: { title, type, url: url || undefined, description: description || undefined } };
      case "update_milestone":
        return {
          op,
          milestonePosition: position,
          ...(title && { title }),
          ...(description && { summary: description }),
          ...(hours && { estimatedHours: Number(hours) }),
        };
    }
  };

  const summary = { add_task: `Add “${title}”`, add_resource: `Add resource “${title}”`, update_milestone: "Adjust a milestone" }[op];

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-sans text-base font-semibold text-fg">Suggest a change</h2>
        <p className="mt-1 text-xs text-faint">The learner sees your reason and decides whether to apply it.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="space-y-1.5">
          <label htmlFor="proposal-op" className="block text-sm font-medium text-fg">
            Change
          </label>
          <select id="proposal-op" value={op} onChange={(e) => setOp(e.target.value as RevisionChange["op"])} className={`min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg ${focus}`}>
            <option value="add_task">Add an assignment or practice task</option>
            <option value="add_resource">Add a learning resource</option>
            <option value="update_milestone">Adjust a milestone</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="proposal-milestone" className="block text-sm font-medium text-fg">
            Milestone
          </label>
          <select id="proposal-milestone" value={position} onChange={(e) => setPosition(Number(e.target.value))} className={`min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg ${focus}`}>
            {upcoming.map((m) => (
              <option key={m.id} value={m.position}>
                {m.position}. {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {op === "add_task" && (
        <div role="radiogroup" aria-label="Task type" className="flex gap-2">
          {(["ASSIGNMENT", "EXERCISE"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 text-sm ${focus} ${
                kind === k ? "border-primary bg-primary-soft font-medium text-primary-text" : "border-line text-muted"
              }`}
            >
              {k === "ASSIGNMENT" ? "Assignment" : "Practice"}
            </button>
          ))}
        </div>
      )}

      <Input
        id="proposal-title"
        label={op === "update_milestone" ? "New title (optional)" : "Title"}
        value={title}
        maxLength={160}
        onChange={(e) => setTitle(e.target.value)}
      />
      {op === "add_resource" && (
        <>
          <Input id="proposal-url" label="Link (optional)" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="space-y-1.5">
            <label htmlFor="proposal-type" className="block text-sm font-medium text-fg">
              Type
            </label>
            <select id="proposal-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={`min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg ${focus}`}>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      {op === "update_milestone" && (
        <Input id="proposal-hours" label="Estimated hours (optional)" type="number" min={0.5} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
      )}
      <Textarea
        id="proposal-description"
        label={op === "update_milestone" ? "New summary (optional)" : op === "add_resource" ? "Why this resource (optional)" : "What to do"}
        rows={3}
        maxLength={2000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Textarea
        id="proposal-rationale"
        label="Your reason — shown to the learner"
        rows={3}
        maxLength={2000}
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
      />
      <InlineError message={error} />
      {sent && <p className="text-sm text-success">Sent for approval.</p>}
      <Button
        disabled={busy || rationale.trim().length < 10}
        onClick={async () => {
          const ok = await send(`/api/roadmaps/${roadmapId}/revisions`, {
            summary: summary.slice(0, 200),
            rationale,
            changes: [change()],
          });
          if (ok) {
            setTitle("");
            setDescription("");
            setUrl("");
            setHours("");
            setRationale("");
          }
        }}
      >
        {busy ? "Sending…" : "Send for approval"}
      </Button>
    </Card>
  );
}
