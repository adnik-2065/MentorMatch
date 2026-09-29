"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui";
import { IconCheck, IconClock, IconNote, IconTeach } from "@/components/icons";
import type { FeedbackView, MilestoneView, TaskKind, TaskView } from "@/lib/roadmap/types";
import { ExternalLink, InlineError, List, SourceBadge, dateLabel, focus, quietButton, weekLabel } from "./bits";

const KIND_LABEL: Record<TaskKind, string> = {
  ASSIGNMENT: "Assignment",
  EXERCISE: "Practice",
  ASSESSMENT: "Checkpoint",
  CAPSTONE: "Final project",
};

type TaskActions = {
  onToggle: (task: TaskView, completed: boolean) => Promise<void>;
  onSaveNote: (task: TaskView, note: string) => Promise<void>;
};

/**
 * One week (or phase) of the plan. The learner gets checkboxes and notes; a
 * mentor gets the same card read-only, with `taskFooter` for their tools.
 */
export function MilestoneCard({
  milestone: m,
  current,
  feedback,
  actions,
  quiz,
  taskFooter,
  defaultOpen,
}: {
  milestone: MilestoneView;
  current: boolean;
  feedback: FeedbackView[];
  actions?: TaskActions;
  quiz?: ReactNode;
  taskFooter?: (task: TaskView) => ReactNode;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const done = m.tasks.filter((t) => t.completedAt).length;
  const panelId = `milestone-${m.id}`;

  return (
    <li className="relative pl-8 sm:pl-10">
      {/* Timeline rail and node */}
      <span aria-hidden="true" className="absolute top-0 bottom-0 left-[11px] w-px bg-line sm:left-[15px]" />
      <span
        aria-hidden="true"
        className={`absolute top-5 left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 sm:h-8 sm:w-8 ${
          m.complete
            ? "border-success bg-success text-on-primary"
            : current
              ? "border-primary bg-primary-soft text-primary-text"
              : "border-line-strong bg-surface text-faint"
        }`}
      >
        {m.complete ? <IconCheck className="h-3.5 w-3.5" /> : <span className="text-[11px] font-semibold">{m.position}</span>}
      </span>

      <div className={`rounded-xl border bg-surface ${current ? "border-primary" : "border-line"}`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={`w-full cursor-pointer rounded-xl p-5 text-left ${focus}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tracking-wide text-faint uppercase">{weekLabel(m.weekStart, m.weekEnd)}</span>
            {current && <Badge tone="primary">You are here</Badge>}
            {m.complete && <Badge tone="success">Done</Badge>}
            <SourceBadge source={m.source} />
            <span className="ml-auto flex items-center gap-1 text-xs text-faint">
              <IconClock className="h-3.5 w-3.5" />~{m.estimatedHours} h
            </span>
          </div>
          <h3 className="mt-2 font-sans text-base font-semibold text-fg">{m.title}</h3>
          <p className="mt-1 text-xs text-faint">
            {done} of {m.tasks.length} tasks done · {open ? "Hide details" : "Show details"}
          </p>
        </button>

        {open && (
          <div id={panelId} className="space-y-6 border-t border-line px-5 pt-5 pb-6">
            <p className="max-w-[70ch] text-sm leading-relaxed text-muted">{m.summary}</p>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="text-xs font-medium tracking-wide text-faint uppercase">Objectives</h4>
                <List items={m.objectives} className="mt-2" />
              </div>
              <div>
                <h4 className="text-xs font-medium tracking-wide text-faint uppercase">Topics</h4>
                <ul className="mt-2 space-y-2">
                  {m.topics.map((t, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium text-fg">{t.name}</span>
                      {t.subtopics.length > 0 && <span className="text-muted"> — {t.subtopics.join(", ")}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium tracking-wide text-faint uppercase">Tasks</h4>
              <ul className="mt-2 space-y-2">
                {m.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    feedback={feedback.filter((f) => f.taskId === task.id)}
                    actions={actions}
                    footer={taskFooter?.(task)}
                  />
                ))}
              </ul>
            </div>

            {quiz}

            {m.resources.length > 0 && (
              <div>
                <h4 className="text-xs font-medium tracking-wide text-faint uppercase">Resources</h4>
                <ul className="mt-2 space-y-2">
                  {m.resources.map((r, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      <Badge>{r.type}</Badge> <ExternalLink href={r.url}>{r.title}</ExternalLink>
                      {r.description && <span className="text-muted"> — {r.description}</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-faint">Suggested by AI or your mentor — check a link before relying on it.</p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-medium tracking-wide text-faint uppercase">You&apos;re done when</h4>
              <List items={m.completionCriteria} className="mt-2" />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function TaskRow({
  task,
  feedback,
  actions,
  footer,
}: {
  task: TaskView;
  feedback: FeedbackView[];
  actions?: TaskActions;
  footer?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(task.note ?? "");
  const checkboxId = `task-${task.id}`;
  const quizTask = task.kind === "ASSESSMENT";

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`rounded-lg border p-3.5 ${task.completedAt ? "border-success/30 bg-success-soft/30" : "border-line bg-inset"}`}>
      <div className="flex items-start gap-3">
        {actions && !quizTask ? (
          <input
            id={checkboxId}
            type="checkbox"
            checked={Boolean(task.completedAt)}
            disabled={busy}
            onChange={(e) => void run(() => actions.onToggle(task, e.target.checked))}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--primary)]"
          />
        ) : (
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
              task.completedAt ? "border-success bg-success text-on-primary" : "border-line-strong bg-surface"
            }`}
          >
            {task.completedAt && <IconCheck className="h-3.5 w-3.5" />}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <label htmlFor={actions && !quizTask ? checkboxId : undefined} className="flex flex-wrap items-center gap-2">
            <Badge tone={task.kind === "CAPSTONE" ? "primary" : "neutral"}>{KIND_LABEL[task.kind]}</Badge>
            <span className={`text-sm font-medium ${task.completedAt ? "text-muted line-through decoration-1" : "text-fg"}`}>
              {task.title}
            </span>
            <SourceBadge source={task.source} />
          </label>
          <p className="mt-1 text-sm leading-relaxed text-muted">{task.description}</p>
          {task.completedAt && (
            <p className="mt-1 text-xs text-success">
              {quizTask ? "Passed" : "Completed"} {dateLabel(task.completedAt)}
            </p>
          )}
          {quizTask && !task.completedAt && actions && (
            <p className="mt-1 text-xs text-faint">Ticks itself off when you pass the quiz below.</p>
          )}

          {feedback.map((f) => (
            <p key={f.id} className="mt-2.5 flex gap-2 rounded-lg border border-primary/20 bg-primary-soft/40 p-2.5 text-sm text-fg">
              <IconTeach className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-text" />
              <span>
                <span className="font-medium">{f.mentor.name}:</span> {f.body}
              </span>
            </p>
          ))}

          {actions && (
            <div className="mt-2">
              {editing ? (
                <div className="space-y-2">
                  <label htmlFor={`${checkboxId}-note`} className="sr-only">
                    Private note for {task.title}
                  </label>
                  <textarea
                    id={`${checkboxId}-note`}
                    rows={3}
                    maxLength={4000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Only you can see this."
                    className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-faint ${focus}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (await run(() => actions.onSaveNote(task, note))) setEditing(false);
                      }}
                      className={`inline-flex min-h-9 cursor-pointer items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-45 ${focus}`}
                    >
                      {busy ? "Saving…" : "Save note"}
                    </button>
                    <button type="button" onClick={() => setEditing(false)} className={quietButton}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : task.note ? (
                <button type="button" onClick={() => setEditing(true)} className={`mt-1 flex w-full cursor-pointer gap-2 rounded-lg p-1 text-left text-sm text-muted hover:bg-surface ${focus}`}>
                  <IconNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-pre-wrap">{task.note}</span>
                </button>
              ) : (
                <button type="button" onClick={() => setEditing(true)} className={`${quietButton} -ml-3 min-h-9`}>
                  <IconNote className="h-3.5 w-3.5" />
                  Add a private note
                </button>
              )}
            </div>
          )}

          {footer}
          <InlineError message={error} />
        </div>
      </div>
    </li>
  );
}
