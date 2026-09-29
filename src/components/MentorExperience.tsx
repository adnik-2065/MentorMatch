"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";
import type { Mentor, MentorExperience } from "@/lib/onboarding";
import type { PlacementTier } from "@/lib/placement";
import { EXPERIENCE_KINDS } from "@/lib/profileValidation";

const TIER_LABEL: Record<PlacementTier, { label: string; tone: "success" | "primary" | "warning" | "neutral" }> = {
  exact: { label: "Matches all your goals", tone: "success" },
  partial: { label: "Matches some goals", tone: "primary" },
  related: { label: "Related experience", tone: "warning" },
  none: { label: "Subject match only", tone: "neutral" },
};

export function PlacementBadge({ tier }: { tier: PlacementTier }) {
  const { label, tone } = TIER_LABEL[tier];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Sample profiles and first-time mentors are labelled, never dressed up as established. */
export function MentorSourceBadges({ mentor }: { mentor: Mentor }) {
  return (
    <>
      {mentor.source === "sample" && <Badge>Sample profile</Badge>}
      {mentor.reviews === 0 && <Badge tone="primary">New mentor</Badge>}
    </>
  );
}

export function formatPeriod(entry: MentorExperience) {
  if (entry.startYear && entry.endYear) {
    return entry.startYear === entry.endYear ? `${entry.startYear}` : `${entry.startYear}–${entry.endYear}`;
  }
  if (entry.startYear) return `${entry.startYear}–present`;
  return null;
}

function kindLabel(entry: MentorExperience) {
  return EXPERIENCE_KINDS.find((k) => k.value === entry.kind)?.label ?? null;
}

export function ExperienceList({ experience }: { experience: MentorExperience[] }) {
  if (experience.length === 0) {
    return <p className="text-sm text-faint">No company or position experience listed.</p>;
  }
  return (
    <ul className="space-y-2">
      {experience.map((entry, i) => {
        const meta = [kindLabel(entry), formatPeriod(entry)].filter(Boolean).join(" · ");
        return (
          <li key={i} className="rounded-lg border border-line bg-inset/40 px-3 py-2.5 text-sm">
            <dl className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[auto_1fr]">
              {entry.company && (
                <>
                  <dt className="text-xs text-faint">Company</dt>
                  <dd className="font-medium text-fg">{entry.company}</dd>
                </>
              )}
              {entry.position && (
                <>
                  <dt className="text-xs text-faint">Position</dt>
                  <dd className="font-medium text-fg">{entry.position}</dd>
                </>
              )}
            </dl>
            <p className="mt-1 text-xs text-faint">
              {meta && `${meta} · `}
              {entry.verification === "verified" ? "Verified" : "Self-reported"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** "View experience" toggle — keyboard and screen-reader friendly via aria-expanded/controls. */
export function ExperienceDisclosure({ experience }: { experience: MentorExperience[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (experience.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg text-sm font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
        {open ? "Hide experience" : `View experience (${experience.length})`}
      </button>
      {open && (
        <div id={id} className="mt-2 space-y-2">
          <ExperienceList experience={experience} />
          <p className="text-xs text-faint">
            MentorMatch doesn&apos;t verify employment. Mentors don&apos;t represent these companies and can&apos;t
            promise referrals, interviews or offers.
          </p>
        </div>
      )}
    </div>
  );
}
