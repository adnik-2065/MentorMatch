"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { IconBolt, IconCalendar, IconCheck, IconSparkle } from "@/components/icons";
import type { Request } from "@/lib/dashboard";

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
          <Badge tone="success">
            <IconCheck className="h-3 w-3" />
            Accepted — chat is open
          </Badge>
        ) : decision === "declined" ? (
          <span className="flex flex-wrap items-center gap-3 text-sm text-faint">
            Declined — sent back to the queue
            <Button variant="ghost" onClick={() => onDecide("accepted")}>
              Undo
            </Button>
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

export function RequestInbox({ requests }: { requests: Request[] }) {
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
            onDecide={(decision) => setDecisions((d) => ({ ...d, [request.id]: decision }))}
          />
        ))}
      </ul>
    </>
  );
}
