"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button, Card, Chip, Input, StepHeading, Textarea } from "@/components/ui";
import { IconArrowLeft, IconClose, IconPlus, IconSparkle } from "@/components/icons";
import { loadProfile } from "@/lib/account";
import { TOPICS } from "@/lib/onboarding";
import { api, ApiError } from "@/lib/roadmap/client";
import {
  LEVELS,
  MAX_WEEKS,
  STYLES,
  levelRank,
  preferenceSchema,
  weeklyHours,
  type Level,
  type PreferenceInput,
  type Style,
} from "@/lib/roadmap/schemas";
import { AccountGate } from "./AccountGate";
import { ErrorState, FieldError, focus, quietButton } from "./bits";

type Fields = Record<string, string[] | undefined>;
type Phase = { kind: "form" } | { kind: "saving" } | { kind: "generating"; requestId: string } | { kind: "failed"; requestId: string; message: string };

const DURATIONS = [2, 4, 6, 8, 12, 16];

export function RoadmapForm() {
  return <AccountGate role="student">{() => <Form />}</AccountGate>;
}

function OptionCard({
  label,
  hint,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 cursor-pointer rounded-lg border p-3.5 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${focus} ${
        selected ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <span className={`block text-sm ${selected ? "font-medium text-primary-text" : "text-fg"}`}>{label}</span>
      <span className="mt-0.5 block text-xs text-faint">{hint}</span>
    </button>
  );
}

function Group({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string[]; children: React.ReactNode }) {
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-error` : undefined} className="space-y-2.5">
      <p id={`${id}-label`} className="text-sm font-medium text-fg">
        {label}
      </p>
      {hint && <p className="-mt-1 text-xs text-faint">{hint}</p>}
      {children}
      <FieldError id={`${id}-error`} messages={error} />
    </div>
  );
}

function Form() {
  const router = useRouter();
  const ownTopics = useMemo(() => loadProfile()?.learnTopics ?? [], []);

  const [skill, setSkill] = useState(ownTopics[0] ?? "");
  const [currentLevel, setCurrentLevel] = useState<Level | "">("");
  const [targetLevel, setTargetLevel] = useState<Level | "">("");
  const [goal, setGoal] = useState("");
  const [timeAmount, setTimeAmount] = useState("6");
  const [timeUnit, setTimeUnit] = useState<"DAY" | "WEEK">("WEEK");
  const [daysPerWeek, setDaysPerWeek] = useState("5");
  const [durationWeeks, setDurationWeeks] = useState("8");
  const [learningStyle, setLearningStyle] = useState<Style | "">("");
  const [topicDraft, setTopicDraft] = useState("");
  const [focusTopics, setFocusTopics] = useState<string[]>([]);

  const [fields, setFields] = useState<Fields>({});
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

  const input: PreferenceInput = {
    skill,
    currentLevel: currentLevel as Level,
    targetLevel: targetLevel as Level,
    goal,
    timeAmount: Number(timeAmount),
    timeUnit,
    daysPerWeek: timeUnit === "DAY" ? Number(daysPerWeek) : undefined,
    durationWeeks: Number(durationWeeks),
    learningStyle: learningStyle as Style,
    focusTopics,
  };
  const perWeek = weeklyHours({ timeAmount: Number(timeAmount) || 0, timeUnit, daysPerWeek: Number(daysPerWeek) || 0 });

  const addTopic = () => {
    const value = topicDraft.trim();
    if (!value || focusTopics.some((t) => t.toLowerCase() === value.toLowerCase()) || focusTopics.length >= 15) return;
    setFocusTopics([...focusTopics, value]);
    setTopicDraft("");
  };

  const generate = async (requestId: string) => {
    setPhase({ kind: "generating", requestId });
    try {
      const { id } = await api<{ id: string }>(`/api/roadmap-requests/${requestId}/generate`, { method: "POST" });
      router.push(`/dashboard/roadmaps/${id}`);
    } catch (e) {
      setPhase({ kind: "failed", requestId, message: e instanceof ApiError ? e.message : "Generation failed." });
    }
  };

  const submit = async () => {
    const parsed = preferenceSchema.safeParse(input);
    if (!parsed.success) {
      setFields(z.flattenError(parsed.error).fieldErrors);
      // Move focus to the first problem so keyboard and screen-reader users land on it.
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[role=alert]")?.scrollIntoView({ block: "center" }));
      return;
    }
    setFields({});
    setPhase({ kind: "saving" });
    try {
      const { id } = await api<{ id: string }>("/api/roadmap-requests", { method: "POST", body: parsed.data });
      await generate(id);
    } catch (e) {
      if (e instanceof ApiError) setFields(e.fields);
      setPhase({ kind: "form" });
    }
  };

  if (phase.kind === "generating" || phase.kind === "saving") {
    return (
      <div role="status" aria-live="polite" className="mx-auto max-w-xl py-10 text-center">
        <span className="inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-primary-soft text-primary-text">
          <IconSparkle className="h-5 w-5" />
        </span>
        <h1 className="mt-5 font-sans text-2xl font-semibold text-fg">Building your {skill} roadmap</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Planning {durationWeeks} weeks at about {perWeek} hours a week, with tasks, checkpoints and a final project.
          This usually takes one to two minutes — keep this tab open.
        </p>
      </div>
    );
  }

  if (phase.kind === "failed") {
    return (
      <div className="mx-auto max-w-xl py-6">
        <ErrorState title="The roadmap didn't generate" body={phase.message} onRetry={() => generate(phase.requestId)} />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => setPhase({ kind: "form" })}>
            Edit my answers
          </Button>
          <Link href="/dashboard/roadmaps" className={quietButton}>
            Back to my roadmaps
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link href="/dashboard/roadmaps" className={`${quietButton} -ml-3`}>
        <IconArrowLeft />
        My roadmaps
      </Link>

      <div className="mt-2">
        <StepHeading
          title="Create a learning roadmap"
          subtitle="Eight quick questions. The more specific your goal, the more useful the plan — we only send these answers to the AI, never your name or email."
        />
      </div>

      <form
        noValidate
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Card className="space-y-5">
          <div className="space-y-1.5">
            <Input
              id="skill"
              label="1. What do you want to learn?"
              hint="Pick from the list or type your own."
              list="skill-options"
              value={skill}
              maxLength={80}
              placeholder="e.g. Docker, Thermodynamics, STAAD.Pro"
              aria-invalid={Boolean(fields.skill)}
              onChange={(e) => setSkill(e.target.value)}
            />
            <datalist id="skill-options">
              {TOPICS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <FieldError id="skill-error" messages={fields.skill} />
          </div>
          {ownTopics.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Your subjects">
              {ownTopics.slice(0, 8).map((t) => (
                <Chip key={t} label={t} selected={skill === t} onClick={() => setSkill(t)} />
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-6">
          <Group id="current" label="2. Where are you now?" error={fields.currentLevel}>
            <div className="grid gap-2 sm:grid-cols-2">
              {LEVELS.map((l) => (
                <OptionCard
                  key={l.value}
                  label={l.label}
                  hint={l.hint}
                  selected={currentLevel === l.value}
                  onClick={() => {
                    setCurrentLevel(l.value);
                    if (targetLevel && levelRank(targetLevel) < levelRank(l.value)) setTargetLevel("");
                  }}
                />
              ))}
            </div>
          </Group>

          <Group id="target" label="3. Where do you want to get to?" error={fields.targetLevel}>
            <div className="grid gap-2 sm:grid-cols-3">
              {LEVELS.slice(1).map((l) => (
                <OptionCard
                  key={l.value}
                  label={l.label}
                  hint={l.hint}
                  selected={targetLevel === l.value}
                  disabled={Boolean(currentLevel) && levelRank(l.value) < levelRank(currentLevel as Level)}
                  onClick={() => setTargetLevel(l.value)}
                />
              ))}
            </div>
          </Group>
        </Card>

        <Card className="space-y-1.5">
          <Textarea
            id="goal"
            label="4. Why are you learning it, and what does success look like?"
            hint="e.g. “Containerise my final-year project and deploy it before the demo.”"
            rows={4}
            maxLength={1000}
            value={goal}
            aria-invalid={Boolean(fields.goal)}
            onChange={(e) => setGoal(e.target.value)}
          />
          <FieldError id="goal-error" messages={fields.goal} />
        </Card>

        <Card className="space-y-6">
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-fg">5. How much time can you give it?</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-28">
                <Input
                  id="time-amount"
                  label="Hours"
                  type="number"
                  inputMode="decimal"
                  min={0.5}
                  step={0.5}
                  value={timeAmount}
                  aria-invalid={Boolean(fields.timeAmount)}
                  onChange={(e) => setTimeAmount(e.target.value)}
                />
              </div>
              <div role="radiogroup" aria-label="Per day or per week" className="flex gap-2">
                {(["DAY", "WEEK"] as const).map((u) => (
                  <Chip key={u} label={u === "DAY" ? "per day" : "per week"} selected={timeUnit === u} onClick={() => setTimeUnit(u)} />
                ))}
              </div>
              {timeUnit === "DAY" && (
                <div className="w-32">
                  <Input
                    id="days-per-week"
                    label="Days a week"
                    type="number"
                    min={1}
                    max={7}
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(e.target.value)}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-faint">About {perWeek} hours a week.</p>
            <FieldError id="time-error" messages={fields.timeAmount ?? fields.daysPerWeek} />
          </div>

          <div className="space-y-2.5">
            <p id="duration-label" className="text-sm font-medium text-fg">
              6. Over how long?
            </p>
            <div role="radiogroup" aria-labelledby="duration-label" className="flex flex-wrap gap-2">
              {DURATIONS.map((w) => (
                <Chip key={w} label={`${w} weeks`} selected={durationWeeks === String(w)} onClick={() => setDurationWeeks(String(w))} />
              ))}
            </div>
            <div className="w-40">
              <Input
                id="duration"
                label="Or exactly"
                hint={`1–${MAX_WEEKS} weeks`}
                type="number"
                min={1}
                max={MAX_WEEKS}
                value={durationWeeks}
                aria-invalid={Boolean(fields.durationWeeks)}
                onChange={(e) => setDurationWeeks(e.target.value)}
              />
            </div>
            <FieldError id="duration-error" messages={fields.durationWeeks} />
          </div>
        </Card>

        <Card>
          <Group id="style" label="7. How do you learn best?" error={fields.learningStyle}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {STYLES.map((s) => (
                <OptionCard
                  key={s.value}
                  label={s.label}
                  hint={s.hint}
                  selected={learningStyle === s.value}
                  onClick={() => setLearningStyle(s.value)}
                />
              ))}
            </div>
          </Group>
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                id="topic"
                label="8. Anything specific you want covered? (optional)"
                hint="Add up to 15 — e.g. “Volumes”, “Compose networking”."
                value={topicDraft}
                maxLength={80}
                onChange={(e) => setTopicDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic();
                  }
                }}
              />
            </div>
            <Button variant="outline" onClick={addTopic} disabled={!topicDraft.trim()}>
              <IconPlus />
              Add
            </Button>
          </div>
          {focusTopics.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {focusTopics.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => setFocusTopics(focusTopics.filter((x) => x !== t))}
                    aria-label={`Remove ${t}`}
                    className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-primary bg-primary-soft px-3.5 text-sm text-primary-text ${focus}`}
                  >
                    {t}
                    <IconClose className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <FieldError id="topics-error" messages={fields.focusTopics} />
        </Card>

        {Object.values(fields).some(Boolean) && (
          <p role="alert" className="text-sm font-medium text-danger">
            A few answers need another look — they&apos;re marked above.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">
            <IconSparkle />
            Generate my roadmap
          </Button>
          <Link href="/dashboard/roadmaps" className={quietButton}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
