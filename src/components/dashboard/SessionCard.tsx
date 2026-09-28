"use client";

import { Badge, Button } from "@/components/ui";
import { IconClock, IconMessage } from "@/components/icons";
import type { Session } from "@/lib/dashboard";

/**
 * One booked session. `perspective` only changes the wording — a junior sees
 * "with Meera J.", a mentor sees "Aditya N. · 2nd Year".
 */
export function SessionCard({
  session,
  perspective,
  featured = false,
}: {
  session: Session;
  perspective: "student" | "mentor";
  featured?: boolean;
}) {
  const soon = session.day === "Today";

  return (
    <article
      className={`rounded-xl border p-5 ${
        featured ? "border-primary/40 bg-primary-soft/40" : "border-line bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={soon ? "primary" : "neutral"}>
              <IconClock className="h-3 w-3" />
              {session.day} · {session.time}
            </Badge>
            <span className="text-xs text-faint">{session.length}</span>
            {session.unread > 0 && (
              <Badge tone="warning">{session.unread} unread</Badge>
            )}
          </div>

          <h3 className="mt-3 font-sans text-lg font-semibold text-fg">{session.topic}</h3>
          <p className="mt-1 text-sm text-muted">{session.concept}</p>
          <p className="mt-2.5 text-xs text-faint">
            {perspective === "student" ? "with " : ""}
            {session.with} · {session.year} {session.branch}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={featured ? "primary" : "outline"}>
            <IconMessage />
            Open chat
          </Button>
          {featured && <Button variant="ghost">Reschedule</Button>}
        </div>
      </div>

      {featured && (
        <p className="mt-4 border-t border-primary/20 pt-3.5 text-xs leading-relaxed text-muted">
          The room opens at slot time and everything happens in chat — you&apos;ll get a reminder 15
          minutes before.
        </p>
      )}
    </article>
  );
}
