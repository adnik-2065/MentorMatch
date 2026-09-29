"use client";

import type { ReactNode } from "react";
import { IconStar } from "./icons";

/** Shared focus treatment — never removed, only replaced with a stronger ring. */
const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  full,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost";
  disabled?: boolean;
  full?: boolean;
  type?: "button" | "submit";
}) {
  // min-h-11 (44px) keeps every button above the mobile touch-target minimum.
  const base = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${focus}`;
  const styles = {
    primary: "bg-primary text-on-primary shadow-[0_8px_20px_rgb(var(--primary-shadow)/0.22)] hover:-translate-y-0.5 hover:bg-primary-hover",
    outline: "border border-line-strong bg-surface text-fg shadow-sm hover:border-primary/35 hover:bg-primary-soft/40",
    ghost: "text-muted hover:bg-inset hover:text-fg",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${full ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}

const inputClass = `w-full min-h-12 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg shadow-sm transition-colors duration-200 placeholder:text-faint hover:border-line-strong ${focus} focus-visible:border-primary`;

export function Input({
  label,
  hint,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
        className={inputClass}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  hint,
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  id: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      <textarea
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
        className={`${inputClass} resize-none leading-relaxed`}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Group label for a set of buttons acting as one choice — keeps the a11y semantics honest. */
export function ChoiceGroup({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-medium text-fg">{label}</legend>
      {hint && <p className="text-xs text-faint">{hint}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function Chip({
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
      role="switch"
      aria-checked={selected}
      onClick={onClick}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-4 text-sm transition-all duration-200 ${focus} ${
        selected
          ? "border-primary/40 bg-primary-soft font-semibold text-primary-text shadow-sm"
          : "border-line bg-surface text-muted shadow-sm hover:border-primary/30 hover:text-fg"
      }`}
    >
      {selected && <span aria-hidden="true">✓</span>}
      {label}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgb(23_26_43/0.04)] ${className}`}>{children}</div>
  );
}

export function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="space-y-2">
      <h2 className="max-w-[25ch] text-3xl font-semibold leading-tight text-fg sm:text-4xl">{title}</h2>
      <p className="max-w-[62ch] text-sm leading-6 text-muted sm:text-base">{subtitle}</p>
    </header>
  );
}

export function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar
          key={n}
          filled={n <= rounded}
          className={`h-3.5 w-3.5 ${n <= rounded ? "text-warning" : "text-line-strong"}`}
        />
      ))}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning";
}) {
  const tones = {
    neutral: "border-line bg-inset text-muted",
    primary: "border-primary/30 bg-primary-soft text-primary-text",
    success: "border-success/30 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning",
  }[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${tones}`}
    >
      {children}
    </span>
  );
}
