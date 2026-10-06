"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { IconBolt, IconCalendar, IconCheck, IconMessage, IconSparkle } from "@/components/icons";
import type { Request } from "@/lib/dashboard";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

type Decision = "accepted" | "declined";

function RequestCard({
  request,
  decision,
  onDecide,
}: {
  request: Request;
  decision?: Decision;
  onDecide: (decision: Decision) => void;
}) {
  return (
    <li
      className={`rounded-xl border p-5 transition-colors duration-200 ${
        decision === "accepted"
          ? "border-success/30 bg-success-soft/50"
          : decision === "declined"
            ? "border-line bg-inset"
            : "border-line bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-sans font-semibold text-fg">{request.from}</span>
        <span className="text-xs text-faint">
          {request.year} · {request.branch}
        </span>
        <Badge>{request.topic}</Badge>
        {request.urgent && !decision && (
          <Badge tone="warning">
            <IconBolt className="h-3 w-3" />
            Urgent
          </Badge>
        )}
        <span className="ml-auto text-xs text-faint">{request.asked}</span>
      </div>

      <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-fg">
        &ldquo;{request.doubt}&rdquo;
      </p>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="text-primary-text">
          <IconSparkle className="h-3.5 w-3.5" />
        </span>
        Concept gap: <span className="font-medium text-fg">{request.concept}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <IconCalendar className="h-3.5 w-3.5" />
          {request.slot}
        </span>

        {decision === "accepted" ? (
          <span className="flex flex-wrap items-center gap-3">
            <Badge tone="success">
              <IconCheck className="h-3 w-3" />
              Accepted
            </Badge>
            {/* The room only exists once the slot is confirmed — that's what accepting does. */}
            <Link
              href={request.bookingId ? `/chat?s=${request.bookingId}` : "/chat"}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-primary-text transition-colors duration-200 hover:bg-inset ${focus}`}
            >
              <IconMessage />
              Open chat
            </Link>
          </span>
        ) : decision === "declined" ? (
          <span className="flex flex-wrap items-center gap-3 text-sm text-faint">
            {request.bookingId
              ? "Declined — the slot went back to the junior"
              : "Declined — sent back to the queue"}
            {/* A declined booking is gone from the store, so there's nothing to undo. */}
            {!request.bookingId && (
              <Button variant="ghost" onClick={() => onDecide("accepted")}>
                Undo
              </Button>
            )}
          </span>
        ) : (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button onClick={() => onDecide("accepted")}>Accept slot</Button>
            <Button variant="ghost" onClick={() => onDecide("declined")}>
              Decline
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * `onDecide` is where a decision on a real booking is written back — accepting
 * confirms the slot and opens the room, declining gives it up. The seeded
 * requests have no booking behind them, so for those it's local state only.
 */
export function RequestInbox({
  requests,
  onDecide,
}: {
  requests: Request[];
  onDecide?: (request: Request, decision: Decision) => void;
}) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const pending = requests.filter((r) => !decisions[r.id]).length;

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {pending} requests waiting
      </p>

      <ul className="space-y-3">
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            decision={decisions[request.id]}
            onDecide={(decision) => {
              setDecisions((d) => ({ ...d, [request.id]: decision }));
              onDecide?.(request, decision);
            }}
          />
        ))}
      </ul>
    </>
  );
}
