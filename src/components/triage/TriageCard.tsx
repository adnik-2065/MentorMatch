"use client";

/**
 * Step 2 of the flow — "AI understands".
 *
 * The same card on `/ask`, `/book` and in onboarding, so the concept gap looks
 * the same wherever it's named. The badge is honest about who answered: Gemini
 * or the offline keyword table. Nothing here decides the mentors — that's
 * `rankMentors()`, and it runs either way.
 */

import { Badge } from "@/components/ui";
import { IconSparkle } from "@/components/icons";
import type { Triage } from "@/lib/onboarding";

export function TriageCard({ triage, className = "" }: { triage: Triage; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-primary/25 bg-primary-soft/50 p-4 ${className}`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">
          <IconSparkle className="h-3 w-3" />
          Identified topic
        </Badge>
        <span className="font-sans text-sm font-semibold text-fg">{triage.concept}</span>
        <Badge>{triage.topic}</Badge>
      </div>

      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted">{triage.explanation}</p>

      {triage.related.length > 0 && (
        <div className="mt-3.5 border-t border-primary/15 pt-3.5">
          <p className="text-xs font-medium text-fg">Related concepts</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {triage.related.map((concept) => (
              <li
                key={concept}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted"
              >
                {concept}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-faint">
        {triage.source === "ai"
          ? "Read by Gemini. A senior still decides what's actually wrong."
          : "Matched offline from keywords — the model wasn't reachable."}
      </p>
    </div>
  );
}
