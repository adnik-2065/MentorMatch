"use client";

/**
 * Step 5 of the flow — "recap & progress".
 *
 * Two halves: the rooms that finished without a recap yet, and the vault of
 * recaps themselves. Generating one calls `/api/recap`, which reads whatever
 * was actually typed in the room; with an empty room it writes the practice
 * for the concept instead of inventing a conversation.
 */

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { EmptyState } from "./Shell";
import { IconCheck, IconNote, IconSparkle } from "@/components/icons";
import type { AccountId } from "@/lib/account";
import { loadMessages } from "@/lib/chat";
import type { Recap } from "@/lib/dashboard";
import { saveRecap, toggleRecapStep, type StoredRecap } from "@/lib/recaps";
import { requestRecap } from "@/lib/triage-client";

/** A finished room a recap can be written from — a session or a doubt. */
export type RecapSource = {
  id: string;
  topic: string;
  concept: string;
  /** "Session with Meera J." / "Doubt you asked" — what the button is about. */
  label: string;
};

function RecapCard({
  recap,
  account,
  refresh,
}: {
  recap: Recap;
  account: AccountId;
  refresh: () => void;
}) {
  const steps = recap.nextSteps ?? [];
  const checked = (recap as StoredRecap).checked ?? [];

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-primary-text">
          <IconNote className="h-3.5 w-3.5" />
        </span>
        <Badge>{recap.topic}</Badge>
        <span className="text-xs text-faint">{recap.date}</span>
        {recap.source === "ai" && (
          <Badge tone="primary">
            <IconSparkle className="h-3 w-3" />
            AI
          </Badge>
        )}
      </div>

      <h3 className="mt-3 text-sm leading-relaxed font-medium text-fg">{recap.title}</h3>

      {recap.points && recap.points.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {recap.points.map((point) => (
            <li key={point} className="flex gap-2 text-sm leading-relaxed text-muted">
              <span aria-hidden="true" className="mt-0.5 text-success">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      )}

      {steps.length > 0 && (
        <div className="mt-4 border-t border-line pt-3.5">
          <p className="text-xs font-medium text-fg">Next steps</p>
          <ul className="mt-2 space-y-1">
            {steps.map((step, i) => (
              <li key={step}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 text-sm leading-relaxed text-muted transition-colors duration-200 hover:bg-inset has-[:checked]:text-faint has-[:checked]:line-through">
                  <input
                    type="checkbox"
                    checked={checked.includes(i)}
                    onChange={() => {
                      toggleRecapStep(account, recap.id, i);
                      refresh();
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  />
                  {step}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-faint">
        Practice tasks: {recap.done} of {recap.tasks} done
      </p>
      <div
        role="progressbar"
        aria-valuenow={recap.done}
        aria-valuemin={0}
        aria-valuemax={recap.tasks}
        aria-label={`${recap.topic} practice tasks`}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-inset"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${recap.tasks > 0 ? (recap.done / recap.tasks) * 100 : 0}%` }}
        />
      </div>
    </Card>
  );
}

export function RecapVault({
  account,
  recaps,
  sources,
  refresh,
}: {
  account: AccountId;
  recaps: Recap[];
  /** Rooms with no recap yet — the caller filters out the ones already written. */
  sources: RecapSource[];
  refresh: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function generate(source: RecapSource) {
    setBusy(source.id);

    // Only what was actually typed in the room. Seeded lines aren't the student's.
    const transcript = loadMessages(account, source.id).map(
      (m) => `${m.from === "me" ? "Student" : "Mentor"}: ${m.text}`,
    );

    const draft = await requestRecap({ topic: source.topic, concept: source.concept, transcript });
    if (draft) {
      saveRecap(account, {
        sessionId: source.id,
        topic: source.topic,
        title: draft.title,
        points: draft.points,
        nextSteps: draft.nextSteps,
        source: draft.source,
      });
      refresh();
    }
    setBusy(null);
  }

  return (
    <>
      {sources.length > 0 && (
        <div className="mb-3 space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-dashed border-line-strong bg-inset/40 p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{source.label}</p>
                <p className="mt-0.5 text-xs text-faint">
                  {source.topic}
                  {source.concept ? ` · ${source.concept}` : ""} — no recap written yet.
                </p>
              </div>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => generate(source)}
              >
                <IconSparkle />
                {busy === source.id ? "Writing it up…" : "Generate recap"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {recaps.length === 0 ? (
        <EmptyState
          title="No recaps yet"
          body="Finish a session or get a doubt answered, and the recap with its practice tasks lands here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {recaps.map((recap) => (
            <RecapCard key={recap.id} recap={recap} account={account} refresh={refresh} />
          ))}
        </div>
      )}
    </>
  );
}
