"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { IconSparkle, IconTeach } from "@/components/icons";
import { safeUrl } from "@/lib/roadmap/schemas";
import type { Source } from "@/lib/roadmap/types";

export const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export const primaryLink = `inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`;
export const outlineLink = `inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`;
export const quietButton = `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors duration-200 hover:bg-inset hover:text-fg disabled:cursor-not-allowed disabled:opacity-45 ${focus}`;

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 overflow-hidden rounded-full bg-inset"
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

/** Placeholder blocks while data loads — shaped like what's coming. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-inset ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <Skeleton className="h-8 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft/50 p-6">
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted">{body}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`}
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium text-danger">
      {message}
    </p>
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-danger">
      {messages[0]}
    </p>
  );
}

export function SourceBadge({ source }: { source: Source }) {
  if (source === "AI") return null;
  return source === "MENTOR" ? (
    <Badge tone="primary">
      <IconTeach className="h-3 w-3" />
      From mentor
    </Badge>
  ) : (
    <Badge tone="warning">
      <IconSparkle className="h-3 w-3" />
      Adjusted
    </Badge>
  );
}

/** Renders a link only for http(s) URLs — AI and mentor input never become javascript: links. */
export function ExternalLink({ href, children }: { href?: string; children: ReactNode }) {
  const url = safeUrl(href);
  if (!url) return <span>{children}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`font-medium text-primary-text underline underline-offset-4 ${focus} rounded-sm`}
    >
      {children}
    </a>
  );
}

export function List({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted">
          <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export const weekLabel = (start: number, end: number) => (start === end ? `Week ${start}` : `Weeks ${start}–${end}`);
