"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { ExperienceList } from "@/components/MentorExperience";
import { IconClose, IconPlus } from "@/components/icons";
import type { ExperienceKind, MentorExperience } from "@/lib/onboarding";
import { EXPERIENCE_KINDS, LIMITS, validateExperienceEntry } from "@/lib/profileValidation";

type Draft = { company: string; position: string; kind: ExperienceKind | ""; startYear: string; endYear: string; current: boolean };

const EMPTY: Draft = { company: "", position: "", kind: "", startYear: "", endYear: "", current: false };

const toYear = (value: string) => (value.trim() ? Number(value.trim()) : null);

function toEntry(draft: Draft): MentorExperience {
  return {
    company: draft.company.trim() || null,
    position: draft.position.trim() || null,
    ...(draft.kind ? { kind: draft.kind } : {}),
    startYear: toYear(draft.startYear),
    endYear: draft.current ? null : toYear(draft.endYear),
    verification: "self-reported",
  };
}

/**
 * Optional company / position history for mentors. Company and position are
 * separate fields so students can match on either one; every entry is stored
 * as self-reported because nothing here is checked.
 */
export function ExperienceEditor({
  experience,
  onChange,
}: {
  experience: MentorExperience[];
  onChange: (experience: MentorExperience[]) => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const full = experience.length >= LIMITS.experience;
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const add = () => {
    const entry = toEntry(draft);
    const found = validateExperienceEntry(entry);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onChange([...experience, entry]);
    setDraft(EMPTY);
  };

  return (
    <Card className="space-y-5 bg-inset/45">
      <div>
        <h3 className="text-sm font-semibold text-fg">Company and position experience (optional)</h3>
        <p className="mt-1 text-xs leading-5 text-faint">
          Helps students preparing for placements find you. Shown as{" "}
          <span className="font-medium text-fg">self-reported</span> — MentorMatch doesn&apos;t verify employment,
          and you won&apos;t be presented as representing the company.
        </p>
      </div>

      {experience.length > 0 && (
        <div className="space-y-2">
          <ExperienceList experience={experience} />
          <ul className="flex flex-wrap gap-2">
            {experience.map((entry, i) => (
              <li key={i}>
                <Button variant="ghost" onClick={() => onChange(experience.filter((_, j) => j !== i))}>
                  <IconClose className="h-3.5 w-3.5" />
                  Remove {[entry.position, entry.company].filter(Boolean).join(" at ")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!full && (
        <fieldset className="space-y-4">
          <legend className="sr-only">Add experience</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="exp-company"
              label="Company"
              placeholder="e.g. Amazon"
              maxLength={LIMITS.label}
              value={draft.company}
              error={errors.company}
              onChange={(e) => set({ company: e.target.value })}
            />
            <Input
              id="exp-position"
              label="Position"
              placeholder="e.g. SDE Intern"
              maxLength={LIMITS.label}
              value={draft.position}
              error={errors.position}
              onChange={(e) => set({ position: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="exp-kind" className="block text-sm font-medium text-fg">
                Type
              </label>
              <select
                id="exp-kind"
                value={draft.kind}
                onChange={(e) => set({ kind: e.target.value as Draft["kind"] })}
                className="min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm text-fg shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Not specified</option>
                {EXPERIENCE_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              id="exp-start"
              label="Start year"
              inputMode="numeric"
              placeholder="2024"
              value={draft.startYear}
              error={errors.startYear}
              onChange={(e) => set({ startYear: e.target.value })}
            />
            <Input
              id="exp-end"
              label="End year"
              inputMode="numeric"
              placeholder="2025"
              disabled={draft.current}
              value={draft.current ? "" : draft.endYear}
              error={errors.endYear}
              onChange={(e) => set({ endYear: e.target.value })}
            />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={draft.current}
              onChange={(e) => set({ current: e.target.checked })}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            I&apos;m currently in this position
          </label>
          <Button variant="outline" onClick={add}>
            <IconPlus />
            Add experience
          </Button>
        </fieldset>
      )}
    </Card>
  );
}
