"use client";

import { useState } from "react";
import { Badge, Button, Card, ChoiceGroup, Input, StepHeading } from "@/components/ui";
import { IconArrowRight, IconGraduation, IconSparkle, IconTeach } from "@/components/icons";
import { BRANCHES, YEARS, type OnboardingState, type Role } from "@/lib/onboarding";

type Patch = (patch: Partial<OnboardingState>) => void;

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-4 text-sm transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
        selected
          ? "border-primary bg-primary-soft font-medium text-primary-text"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}

export function VerifyStep({
  state,
  patch,
  next,
}: {
  state: OnboardingState;
  patch: Patch;
  next: () => void;
}) {
  const [sent, setSent] = useState(state.verified);
  const [touched, setTouched] = useState(false);
  const email = state.email.trim();
  const isCollegeMail = /\.(edu|ac)\.[a-z]{2,}$|\.edu$/i.test(email);
  const showError = touched && email.length > 0 && !isCollegeMail;

  return (
    <div className="space-y-7">
      <StepHeading
        title="Verify your college email"
        subtitle="This keeps MentorMatch scoped to real students on real campuses — it's the only gate on the whole platform."
      />

      <div className="space-y-1.5">
        <Input
          id="college-email"
          type="email"
          label="College email"
          hint="Your institute address, e.g. you@college.ac.in"
          value={state.email}
          placeholder="you@college.ac.in"
          aria-invalid={showError}
          onBlur={() => setTouched(true)}
          onChange={(e) => patch({ email: e.target.value, verified: false })}
        />
        {showError && (
          <p role="alert" className="text-xs font-medium text-danger">
            That doesn&apos;t look like a college address — it should end in .ac.in or .edu
          </p>
        )}
      </div>

      {!sent ? (
        <Button disabled={!isCollegeMail} onClick={() => setSent(true)}>
          Send code
          <IconArrowRight />
        </Button>
      ) : (
        <div className="space-y-5">
          <Card className="bg-inset">
            <p className="text-sm text-muted">
              We sent a 6-digit code to <span className="font-medium text-fg">{email}</span>.
            </p>
            <p className="mt-1.5 text-xs text-faint">
              Demo build — any 6 digits work until email delivery is wired up.
            </p>
          </Card>

          <Input
            id="otp"
            label="Enter the code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={state.otp}
            placeholder="123456"
            onChange={(e) => patch({ otp: e.target.value.replace(/\D/g, "") })}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={state.otp.length !== 6}
              onClick={() => {
                patch({ verified: true });
                next();
              }}
            >
              Verify and continue
              <IconArrowRight />
            </Button>
            <Button variant="ghost" onClick={() => setSent(false)}>
              Change email
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfileStep({
  state,
  patch,
  next,
}: {
  state: OnboardingState;
  patch: Patch;
  next: () => void;
}) {
  const ready = state.name.trim() && state.college.trim() && state.year && state.branch;

  return (
    <div className="space-y-7">
      <StepHeading
        title="Tell us where you are"
        subtitle="Your year and branch decide who you get matched with — and who gets matched to you."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="name"
          label="Name"
          autoComplete="name"
          value={state.name}
          placeholder="Your name"
          onChange={(e) => patch({ name: e.target.value })}
        />
        <Input
          id="college"
          label="College"
          autoComplete="organization"
          value={state.college}
          placeholder="Your institute"
          onChange={(e) => patch({ college: e.target.value })}
        />
      </div>

      <ChoiceGroup label="Year">
        {YEARS.map((y) => (
          <OptionButton
            key={y}
            label={y}
            selected={state.year === y}
            onClick={() => patch({ year: y })}
          />
        ))}
      </ChoiceGroup>

      <ChoiceGroup label="Branch">
        {BRANCHES.map((b) => (
          <OptionButton
            key={b}
            label={b}
            selected={state.branch === b}
            onClick={() => patch({ branch: b })}
          />
        ))}
      </ChoiceGroup>

      <Button disabled={!ready} onClick={next}>
        Continue
        <IconArrowRight />
      </Button>
    </div>
  );
}

export function RoleStep({ patch, next }: { patch: Patch; next: () => void }) {
  const pick = (role: Role) => {
    patch({ role });
    next();
  };

  const cards = [
    {
      role: "junior" as const,
      icon: <IconGraduation className="h-6 w-6" />,
      title: "I need help",
      body: "Find a senior who has already solved what you're stuck on.",
      meta: "~2 minutes · ends with a booked session",
    },
    {
      role: "mentor" as const,
      icon: <IconTeach className="h-6 w-6" />,
      title: "I can help",
      body: "Verify what you know, publish your slots, get booked.",
      meta: "~10 minutes · includes SkillProof",
    },
  ];

  return (
    <div className="space-y-7">
      <StepHeading
        title="What brings you here first?"
        subtitle="One account, both hats. You can switch on the other side any time from your dashboard."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.role}
            type="button"
            onClick={() => pick(c.role)}
            className="group cursor-pointer rounded-xl border border-line bg-surface p-5 text-left transition-colors duration-200 outline-none hover:border-primary hover:bg-primary-soft/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
              {c.icon}
            </span>
            <h3 className="mt-4 font-sans text-lg font-semibold text-fg">{c.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.body}</p>
            <p className="mt-4 text-xs text-faint">{c.meta}</p>
          </button>
        ))}
      </div>

      <Card className="flex flex-wrap items-center gap-3 bg-inset">
        <Badge tone="primary">
          <IconSparkle className="h-3 w-3" />
          Tip
        </Badge>
        <p className="text-sm text-muted">
          Most 2nd and 3rd years do both — mentor in C, get mentored in DSA.
        </p>
      </Card>
    </div>
  );
}
