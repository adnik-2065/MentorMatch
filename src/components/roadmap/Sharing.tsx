"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { IconCalendar, IconMessage, IconShield, IconTeach } from "@/components/icons";
import { api, ApiError, useApi } from "@/lib/roadmap/client";
import type { FeedbackView, MentorOption, ShareView } from "@/lib/roadmap/types";
import { ExternalLink, InlineError, Skeleton, dateLabel, quietButton } from "./bits";

/** The learner's control over who can see this roadmap. */
export function SharePanel({
  roadmapId,
  skill,
  shares,
  editable,
  onChange,
}: {
  roadmapId: string;
  skill: string;
  shares: ShareView[];
  editable: boolean;
  onChange: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That didn't go through.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-sans text-base font-semibold text-fg">Your mentor</h2>
        <p className="mt-1 flex items-start gap-2 text-xs leading-relaxed text-faint">
          <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-text" />
          Private until you share. A mentor sees milestones, task completion and quiz scores — never your notes or
          what you tell the coach. They can suggest changes; you decide.
        </p>
      </div>

      {shares.length > 0 ? (
        <ul className="space-y-2">
          {shares.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-inset p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{s.mentor.name || "Mentor"}</p>
                <p className="text-xs text-faint">
                  {[s.mentor.year, s.mentor.branch].filter(Boolean).join(" · ")} · shared {dateLabel(s.createdAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run(s.id, () => api(`/api/roadmaps/${roadmapId}/shares/${s.id}`, { method: "DELETE" }))}
                className={`${quietButton} min-h-9 text-danger hover:text-danger`}
              >
                {busy === s.id ? "Stopping…" : "Stop sharing"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Not shared with anyone.</p>
      )}

      <InlineError message={error} />

      {editable &&
        (picking ? (
          <MentorPicker
            skill={skill}
            exclude={shares.map((s) => s.mentor.id)}
            busy={busy}
            onPick={(mentorId) =>
              run(mentorId, async () => {
                await api(`/api/roadmaps/${roadmapId}/shares`, { method: "POST", body: { mentorId } });
                setPicking(false);
              })
            }
            onCancel={() => setPicking(false)}
          />
        ) : (
          <Button variant="outline" onClick={() => setPicking(true)}>
            <IconTeach className="h-4 w-4" />
            Share with a mentor
          </Button>
        ))}
    </Card>
  );
}

function MentorPicker({
  skill,
  exclude,
  busy,
  onPick,
  onCancel,
}: {
  skill: string;
  exclude: string[];
  busy: string | null;
  onPick: (mentorId: string) => void;
  onCancel: () => void;
}) {
  const { data, error, loading, reload } = useApi<{ mentors: MentorOption[] }>(
    `/api/mentors?skill=${encodeURIComponent(skill)}`,
  );
  const mentors = data?.mentors.filter((m) => !exclude.includes(m.id)) ?? [];

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <p className="text-sm font-medium text-fg">Pick a MentorMatch mentor</p>
      {loading && !data ? (
        <div role="status" aria-label="Loading mentors" className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : error ? (
        <InlineError message={error.message} />
      ) : mentors.length === 0 ? (
        <p className="text-sm text-muted">
          No other mentors have signed in yet. Mentors appear here once they&apos;ve onboarded and signed in with their
          college email.
          <button type="button" onClick={reload} className={`${quietButton} ml-1 min-h-9`}>
            Refresh
          </button>
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {mentors.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-inset p-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                  {m.name}
                  {m.teachesSkill && <Badge tone="success">Teaches {skill}</Badge>}
                </p>
                <p className="text-xs text-faint">
                  {[m.year, m.branch].filter(Boolean).join(" · ")}
                  {m.teachTopics.length > 0 && ` · ${m.teachTopics.slice(0, 4).join(", ")}`}
                </p>
              </div>
              <Button variant="outline" onClick={() => onPick(m.id)} disabled={busy !== null}>
                {busy === m.id ? "Sharing…" : "Share"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onCancel} className={`${quietButton} -ml-3 min-h-9`}>
        Cancel
      </button>
    </div>
  );
}

/** Mentor comments that aren't attached to a single task, plus recommended sessions. */
export function MentorNotes({ feedback }: { feedback: FeedbackView[] }) {
  const general = feedback.filter((f) => f.kind !== "TASK");
  if (general.length === 0) return null;

  return (
    <ul className="space-y-3">
      {general.map((f) => (
        <li key={f.id} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            {f.kind === "SESSION" ? (
              <Badge tone="primary">
                <IconCalendar className="h-3 w-3" />
                Session suggested
              </Badge>
            ) : (
              <Badge>
                <IconMessage className="h-3 w-3" />
                Note
              </Badge>
            )}
            <span className="text-sm font-medium text-fg">{f.mentor.name}</span>
            <span className="ml-auto text-xs text-faint">{dateLabel(f.createdAt)}</span>
          </div>
          {f.sessionTopic && <p className="mt-2 text-sm font-medium text-fg">{f.sessionTopic}</p>}
          <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-muted">{f.body}</p>
          {f.kind === "SESSION" && (
            <p className="mt-2 text-xs text-faint">
              {f.bookingHref ? (
                <ExternalLink href={f.bookingHref}>Book this session</ExternalLink>
              ) : (
                `Booking from roadmaps isn't live yet — reach out to ${f.mentor.name} to pick a time.`
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
