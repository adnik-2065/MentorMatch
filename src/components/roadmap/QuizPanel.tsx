"use client";

import { useState } from "react";
import { Badge, Button, Textarea } from "@/components/ui";
import { IconCheck, IconClose, IconSparkle } from "@/components/icons";
import { api, ApiError } from "@/lib/roadmap/client";
import type { AttemptResult, MilestoneView } from "@/lib/roadmap/types";
import { InlineError, dateLabel, focus } from "./bits";

/**
 * A checkpoint, not an exam: the server grades it, the learner sees why each
 * answer was right, and a low score leads straight to the adaptive coach.
 */
export function QuizPanel({
  roadmapId,
  milestone,
  editable,
  onSubmitted,
  onAskForHelp,
}: {
  roadmapId: string;
  milestone: MilestoneView;
  editable: boolean;
  onSubmitted: () => void;
  onAskForHelp: (attemptId: string, milestoneId: string) => void;
}) {
  const questions = milestone.quiz.questions;
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [difficulties, setDifficulties] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);

  if (questions.length === 0) return null;
  const last = milestone.attempts[0];

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<AttemptResult>(`/api/roadmaps/${roadmapId}/milestones/${milestone.id}/attempts`, {
        method: "POST",
        body: { answers, difficulties: difficulties || undefined },
      });
      setResult(res);
      onSubmitted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't submit the quiz.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setAnswers(questions.map(() => null));
    setDifficulties("");
  };

  return (
    <section aria-label="Checkpoint quiz" className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium text-fg">Checkpoint quiz · {questions.length} questions</h4>
        {last && (
          <Badge tone={last.score / last.maxScore >= 0.7 ? "success" : "warning"}>
            Last: {last.score}/{last.maxScore} on {dateLabel(last.createdAt)}
          </Badge>
        )}
        {editable && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`ml-auto inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-line-strong bg-surface px-3.5 text-sm font-medium text-fg hover:bg-inset ${focus}`}
          >
            {last ? "Retake" : "Take the quiz"}
          </button>
        )}
      </div>

      {open && !result && (
        <form
          className="mt-4 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {questions.map((q, qi) => (
            <fieldset key={qi} className="space-y-2">
              <legend className="text-sm font-medium text-fg">
                {qi + 1}. {q.question}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((option, oi) => {
                  const id = `q-${milestone.id}-${qi}-${oi}`;
                  const selected = answers[qi] === oi;
                  return (
                    <label
                      key={oi}
                      htmlFor={id}
                      className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                        selected ? "border-primary bg-primary-soft text-primary-text" : "border-line bg-surface text-muted hover:border-line-strong"
                      }`}
                    >
                      <input
                        id={id}
                        type="radio"
                        name={`q-${milestone.id}-${qi}`}
                        checked={selected}
                        onChange={() => setAnswers(answers.map((a, i) => (i === qi ? oi : a)))}
                        className="sr-only"
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <Textarea
            id={`quiz-difficulties-${milestone.id}`}
            label="Anything you found hard? (optional)"
            hint="This helps the coach if you ask for suggestions afterwards."
            rows={2}
            maxLength={2000}
            value={difficulties}
            onChange={(e) => setDifficulties(e.target.value)}
          />

          <InlineError message={error} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || answers.some((a) => a === null)}>
              {busy ? "Checking…" : "Submit answers"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {result && (
        <div className="mt-4 space-y-4" aria-live="polite">
          <div className={`rounded-lg p-3.5 ${result.passed ? "bg-success-soft" : "bg-warning-soft"}`}>
            <p className="text-sm font-medium text-fg">
              {result.score} of {result.maxScore} correct —{" "}
              {result.passed ? "checkpoint passed." : `you need ${Math.ceil(result.passMark * result.maxScore)} to tick it off.`}
            </p>
            <p className="mt-1 text-xs text-muted">
              {result.passed
                ? "A good sign you're on track — a short quiz can't prove mastery, so keep going with the tasks."
                : "That's useful information, not a verdict. Review the explanations, or ask for suggestions."}
            </p>
          </div>

          <ol className="space-y-3">
            {result.results.map((r, i) => (
              <li key={i} className="text-sm">
                <p className="flex items-start gap-2 font-medium text-fg">
                  {r.correct ? (
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <IconClose className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  )}
                  <span>
                    <span className="sr-only">{r.correct ? "Correct: " : "Incorrect: "}</span>
                    {r.question}
                  </span>
                </p>
                {!r.correct && (
                  <p className="mt-1 pl-6 text-muted">
                    Answer: {questions[i].options[r.correctIndex]}
                  </p>
                )}
                {r.explanation && <p className="mt-1 pl-6 text-muted">{r.explanation}</p>}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            {!result.passed && (
              <Button onClick={() => onAskForHelp(result.attemptId, milestone.id)}>
                <IconSparkle />
                Get suggestions
              </Button>
            )}
            <Button variant="outline" onClick={reset}>
              Retake
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
