"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { IconClock, IconHourglass, IconMessage } from "@/components/icons";
import type { Session } from "@/lib/dashboard";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

/**
 * One booked session. `perspective` only changes the wording — a junior sees
 * "with Meera J.", a mentor sees "Aditya N. · 2nd Year". `onCancel` is only
 * passed for sessions you booked yourself, which are the only cancellable ones,
 * and `onAccept` stands in for the mentor's reply while there's no backend to
 * carry it — it's labelled as the stand-in it is.
 */
export function SessionCard({
  session,
  perspective,
  featured = false,
  onCancel,
  onAccept,
}: {
  session: Session;
  perspective: "student" | "mentor";
  featured?: boolean;
  onCancel?: () => void;
  onAccept?: () => void;
}) {
  const pending = session.status === "pending";
  const soon = !pending && session.day === "Today";
  const firstName = session.with.split(" ")[0];

  return (
    <article
      className={`rounded-xl border p-5 ${
        pending
          ? "border-warning/30 bg-warning-soft/40"
          : featured
            ? "border-primary/40 bg-primary-soft/40"
            : "border-line bg-surface"
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
            {pending && (
              <Badge tone="warning">
                <IconHourglass className="h-3 w-3" />
                Awaiting {perspective === "student" ? firstName : "your"} confirmation
              </Badge>
            )}
            {!pending && session.unread > 0 && (
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

        {/* No room until the mentor accepts — there'd be nobody to read it. */}
        <div className="flex flex-wrap gap-2">
          {!pending && (
            <Link
              href={`/chat?s=${session.id}`}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors duration-200 ${focus} ${
                featured
                  ? "bg-primary text-on-primary hover:bg-primary-hover"
                  : "border border-line-strong bg-surface text-fg hover:bg-inset"
              }`}
            >
              <IconMessage />
              Open chat
            </Link>
          )}
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              {pending ? "Withdraw" : "Cancel"}
            </Button>
          )}
        </div>
      </div>

      {pending ? (
        <div className="mt-4 border-t border-warning/25 pt-3.5">
          <p className="text-xs leading-relaxed text-muted">
            {perspective === "student"
              ? `${firstName} hasn't accepted this slot yet. Chat opens as soon as they do — you'll be notified, and the slot is held until then.`
              : "This junior is waiting on you. Accept it from your requests and the room opens for both of you."}
          </p>

          {onAccept && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Button variant="ghost" onClick={onAccept}>
                Accept as {firstName}
              </Button>
              <span className="text-xs text-faint">
                Stands in for {firstName} until the backend can carry their reply.
              </span>
            </div>
          )}
        </div>
      ) : (
        featured && (
          <p className="mt-4 border-t border-primary/20 pt-3.5 text-xs leading-relaxed text-muted">
            The room opens at slot time and everything happens in chat — you&apos;ll get a reminder
            15 minutes before.
          </p>
        )
      )}
    </article>
  );
}
