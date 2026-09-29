"use client";

import { useState } from "react";
import { Badge, Button, Card, ChoiceGroup, Input, StepHeading } from "@/components/ui";
import { StepActions, type StepNav } from "./StepActions";
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
  nav,
}: {
  state: OnboardingState;
  patch: Patch;
  nav: StepNav;
}) {
  const { errors } = nav;

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="About you"
        title="A little context makes every match better"
        subtitle="Your year and branch help us prioritize seniors who understand your coursework. Nothing here is publicly shared by default."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="name"
          label="Name"
          autoComplete="name"
          required
          value={state.name}
          placeholder="Your name"
          error={errors.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <Input
          id="college"
          label="College"
          autoComplete="organization"
          required
          value={state.college}
          placeholder="Your institute"
          error={errors.college}
          onChange={(e) => patch({ college: e.target.value })}
        />
        <div className="sm:col-span-2">
          <Input
            id="college-email"
            type="email"
            label="College email (optional)"
            hint="Kept in this browser only. Verification is not required in this build."
            autoComplete="email"
            value={state.email}
            placeholder="you@college.ac.in"
            error={errors.email}
            onChange={(e) => patch({ email: e.target.value })}
          />
        </div>
      </div>

      <ChoiceGroup id="year" label="Year" error={errors.year}>
        {YEARS.map((y) => (
          <OptionButton
            key={y}
            label={y}
            selected={state.year === y}
            onClick={() => patch({ year: y })}
          />
        ))}
      </ChoiceGroup>

      <ChoiceGroup id="branch" label="Branch" hint="Subjects and mentors follow your branch first." error={errors.branch}>
        {BRANCHES.map((b) => (
          <OptionButton
            key={b}
            label={b}
            selected={state.branch === b}
            onClick={() => patch({ branch: b })}
          />
        ))}
      </ChoiceGroup>

      <StepActions onBack={nav.back} onContinue={() => nav.next()} errorCount={Object.keys(errors).length} />
    </div>
  );
}

export function RoleStep({ state, nav }: { state: OnboardingState; nav: StepNav }) {
  const pick = (role: Role) => nav.next({ role });
  const cards = [
    {
      role: "junior" as const,
      icon: <IconGraduation className="h-6 w-6" />,
      title: "I need help",
      body: "Find a senior who has already solved what you're stuck on.",
      meta: "~2 minutes · ends with suggested mentors",
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
        title="How do you want to use MentorMatch?"
        subtitle="Choose your starting workspace. You can always add the other side later without creating another account."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.role}
            type="button"
            aria-pressed={state.role === c.role}
            onClick={() => pick(c.role)}
            className={`group cursor-pointer rounded-2xl border bg-surface p-6 ${state.role === c.role ? "border-primary ring-1 ring-primary/40" : "border-line"} text-left shadow-sm transition-all duration-200 outline-none hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_45px_rgb(23_26_43/0.09)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary-text transition-colors group-hover:bg-primary group-hover:text-on-primary">
              {c.icon}
            </span>
            <h3 className="mt-4 font-sans text-lg font-semibold text-fg">{c.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.body}</p>
            <p className="mt-5 inline-flex rounded-full bg-inset px-3 py-1.5 text-xs font-medium text-faint">{c.meta}</p>
          </button>
        ))}
      </div>

      <Card className="flex flex-wrap items-center gap-3 border-primary/15 bg-primary-soft/40">
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
